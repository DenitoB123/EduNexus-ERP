import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/app-logger.service';

export type AuditEventType =
  | 'RATE_LIMIT_EXCEEDED'
  | 'SUSPICIOUS_PAYLOAD'
  | 'INVALID_ORIGIN'
  | 'FAILED_AUTH'
  | 'SECRET_ACCESS'
  | 'PERMISSION_DENIED';

export interface AuditEvent {
  type: AuditEventType;
  ip?: string;
  tenantId?: string;
  correlationId?: string;
  details?: unknown;
}

@Injectable()
export class SecurityAuditLogger {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('SecurityAuditLogger');
  }

  log(event: AuditEvent): void {
    this.logger.warn(
      `[SECURITY_AUDIT] ${event.type} | ip=${event.ip ?? 'unknown'} | tenant=${event.tenantId ?? 'unknown'} | corr=${event.correlationId ?? 'unknown'} | details=${JSON.stringify(event.details ?? {})}`,
    );
  }

  suspicious(ip: string, reason: string, correlationId?: string): void {
    this.log({ type: 'SUSPICIOUS_PAYLOAD', ip, correlationId, details: { reason } });
  }

  rateLimitExceeded(ip: string, correlationId?: string): void {
    this.log({ type: 'RATE_LIMIT_EXCEEDED', ip, correlationId });
  }
}
