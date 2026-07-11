import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { SqlInjectionHelper } from '../sanitizers/sql-injection.helper';
import { XssProtectionHelper } from '../sanitizers/xss-protection.helper';
import { SecurityAuditLogger } from './security-audit.logger';
import { SecurityMetrics } from './security-metrics.service';

@Injectable()
export class SuspiciousActivityLogger {
  constructor(
    private readonly auditLogger: SecurityAuditLogger,
    private readonly metrics: SecurityMetrics,
  ) {}

  inspectRequestBody(req: Request): void {
    const raw = JSON.stringify(req.body ?? {});

    if (SqlInjectionHelper.containsSqlPattern(raw) || !XssProtectionHelper.isClean(raw)) {
      this.metrics.recordSuspiciousPayload();
      this.auditLogger.suspicious(
        req.ip ?? 'unknown',
        'Request body matched SQL/XSS heuristic pattern',
        req.headers['x-correlation-id'] as string | undefined,
      );
    }
  }
}
