/**
 * audit.interceptor.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 *
 * Registered globally in app.module.ts (APP_INTERCEPTOR), after
 * LoggingInterceptor specifically so `x-correlation-id` is already set on
 * the request by the time AuditContextResolver reads it.
 *
 * Capture policy (kept deliberately simple to satisfy "Minimal Request
 * Overhead" — no request-body diffing happens here, see
 * audited.repository.ts for where real diffs come from):
 *   - @AuditIgnore() on the handler -> never captured.
 *   - @Audit(options) on the handler -> captured with those exact
 *     action/category/severity/module values.
 *   - Neither decorator, method is GET -> not captured (reads aren't
 *     "activity" in the sense this framework tracks; searching audit
 *     data itself would otherwise recursively audit-log every audit
 *     search).
 *   - Neither decorator, method is POST/PUT/PATCH/DELETE -> captured as
 *     a generic API_CALL, inferring action from the HTTP verb.
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuditService } from '../audit/audit.service';
import { AUDIT_METADATA_KEY, AUDIT_ENTITY_KEY, AUDIT_IGNORE_KEY, AuditOptions } from '../decorators/audit.decorator';
import { AuditContextResolver } from '../utils/audit-context.util';
import { AuditMetadataUtil } from '../utils/audit-metadata.util';
import { AuditActionType, AuditCategory, AuditSeverity } from '../interfaces/audit-event.interface';

const VERB_TO_ACTION: Record<string, AuditActionType> = {
  POST: AuditActionType.CREATE,
  PUT: AuditActionType.UPDATE,
  PATCH: AuditActionType.UPDATE,
  DELETE: AuditActionType.DELETE,
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const ignored = this.reflector.getAllAndOverride<boolean>(AUDIT_IGNORE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (ignored) {
      return next.handle();
    }

    const options = this.reflector.get<AuditOptions | undefined>(AUDIT_METADATA_KEY, context.getHandler());
    const request = context.switchToHttp().getRequest<Request>();

    if (!options && request.method === 'GET') {
      return next.handle();
    }

    const entityType =
      options?.entityType ?? this.reflector.get<string | undefined>(AUDIT_ENTITY_KEY, context.getClass());
    const auditContext = AuditContextResolver.resolve(context);
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse<Response>();
        this.capture(context, options, entityType, auditContext, startTime, response.statusCode);
      }),
      catchError((error: unknown) => {
        const response = context.switchToHttp().getResponse<Response>();
        const statusCode = (error as { status?: number })?.status ?? response.statusCode ?? 500;
        this.capture(context, options, entityType, auditContext, startTime, statusCode, error);
        return throwError(() => error);
      }),
    );
  }

  private capture(
    context: ExecutionContext,
    options: AuditOptions | undefined,
    entityType: string | undefined,
    auditContext: { tenantId?: string; actorId?: string; correlationId?: string },
    startTime: number,
    statusCode: number,
    error?: unknown,
  ): void {
    if (!auditContext.tenantId) {
      // No tenant context (e.g. a genuinely public/unauthenticated route) —
      // AuditEvent.tenantId is mandatory, so there's nothing safe to write.
      return;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const requestMeta = AuditMetadataUtil.extract(request);
    const durationMs = Date.now() - startTime;
    const action = options?.action ?? VERB_TO_ACTION[request.method] ?? AuditActionType.API_CALL;
    const category = options?.category ?? (options ? AuditCategory.DATA_CHANGE : AuditCategory.API);
    const severity = error ? AuditSeverity.WARNING : (options?.severity ?? AuditSeverity.INFO);

    this.auditService.record({
      tenantId: auditContext.tenantId,
      category,
      action,
      severity,
      module: options?.module ?? this.inferModule(requestMeta.url),
      entityType,
      actorId: auditContext.actorId,
      correlationId: auditContext.correlationId,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
      statusCode,
      durationMs,
      message: error instanceof Error ? error.message : undefined,
      metadata: { method: requestMeta.method, url: requestMeta.url },
    });
  }

  private inferModule(url: string): string {
    // '/api/v1/students/123' -> 'students'. Falls back to the raw path if
    // it's shorter than expected rather than throwing on an unusual route.
    const segments = url.split('?')[0].split('/').filter(Boolean);
    return segments[2] ?? segments[0] ?? 'unknown';
  }
}
