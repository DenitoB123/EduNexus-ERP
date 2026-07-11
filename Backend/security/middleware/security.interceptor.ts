import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Request } from 'express';
import { SuspiciousActivityLogger } from '../monitoring/suspicious-activity.logger';
import { ResponseSanitizerService } from '../sanitizers/response-sanitizer.service';
import { SecurityAuditLogger } from '../monitoring/security-audit.logger';
import { BaseException } from '../../common/exceptions/base.exception';

@Injectable()
export class SecurityInterceptor implements NestInterceptor {
  constructor(
    private readonly suspiciousActivityLogger: SuspiciousActivityLogger,
    private readonly responseSanitizer: ResponseSanitizerService,
    private readonly auditLogger: SecurityAuditLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    this.suspiciousActivityLogger.inspectRequestBody(request);

    return next.handle().pipe(
      map((data: unknown) => {
        if (data !== null && typeof data === 'object' && !Buffer.isBuffer(data)) {
          return this.responseSanitizer.maskSensitiveFields(data as Record<string, unknown>);
        }
        return data;
      }),
      catchError((error: unknown) => {
        if (error instanceof BaseException && error.code === 'FORBIDDEN') {
          this.auditLogger.log({
            type: 'PERMISSION_DENIED',
            ip: request.ip,
            correlationId: request.headers['x-correlation-id'] as string | undefined,
            details: { message: error.message },
          });
        }

        if (error instanceof BaseException && error.code === 'UNAUTHORIZED') {
          this.auditLogger.log({
            type: 'FAILED_AUTH',
            ip: request.ip,
            correlationId: request.headers['x-correlation-id'] as string | undefined,
          });
        }

        return throwError(() => error);
      }),
    );
  }
}
