/**
 * audit-context.util.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 *
 * Resolves who/what/where for an audit event from an ExecutionContext,
 * reusing the codebase's existing context sources rather than
 * reintroducing new ones:
 *   - actorId/tenantId/schoolId/campusId: request.tenantContext
 *     (TenantIsolationMiddleware / TenantContextService's shape — see
 *     database/interfaces/tenant-context.interface.ts)
 *   - correlationId: request.headers['x-correlation-id'], already set by
 *     LoggingInterceptor/RequestContextMiddleware via CorrelationIdUtil
 *     before this ever runs (AuditInterceptor is registered after
 *     LoggingInterceptor in app.module.ts specifically so this holds)
 */

import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface IResolvedAuditContext {
  tenantId?: string;
  actorId?: string;
  correlationId?: string;
}

export class AuditContextResolver {
  static resolve(context: ExecutionContext): IResolvedAuditContext {
    const request = context.switchToHttp().getRequest<Request>();
    const correlationIdHeader = request.headers['x-correlation-id'];

    return {
      tenantId: request.tenantContext?.tenantId,
      actorId: request.tenantContext?.actorId ?? request.authContext?.userId,
      correlationId: Array.isArray(correlationIdHeader) ? correlationIdHeader[0] : correlationIdHeader,
    };
  }
}
