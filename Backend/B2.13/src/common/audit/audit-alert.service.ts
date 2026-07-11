/**
 * audit-alert.service.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 *
 * Integrates with the EXISTING SecurityAuditLogger/SecurityMetrics
 * (security/monitoring/) rather than reimplementing security-event
 * logging — this service adds the audit-framework-specific pieces that
 * didn't exist before: (a) multiple-failed-login detection over a sliding
 * window, (b) persisting a CRITICAL AuditEvent for anything it flags (so
 * alerts show up in the same searchable/exportable audit trail as
 * everything else), and (c) privilege-escalation / config-change
 * signals, which SecurityAuditLogger's existing AuditEventType union
 * doesn't cover (it's scoped to request-level threats: rate limits,
 * payload injection, auth failures — not authorization/config domain
 * events).
 *
 * The failed-login counter is a simple in-memory sliding window keyed by
 * `tenantId:identifier`, sized for a single-process deployment. If
 * EduNexus runs multiple API instances behind a load balancer, this
 * counter won't be shared across them — Redis-backed counting (the
 * codebase already has infrastructure/redis) is the natural upgrade path,
 * noted here rather than built preemptively for a single-instance-adequate
 * v1.
 */

import { Injectable } from '@nestjs/common';
import { AuditService } from './audit.service';
import { SecurityAuditLogger } from '../../security/monitoring/security-audit.logger';
import { AuditActionType, AuditCategory, AuditSeverity } from '../interfaces/audit-event.interface';

const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const FAILED_LOGIN_THRESHOLD = 5;

interface FailedLoginWindow {
  attempts: number[];
}

@Injectable()
export class AuditAlertService {
  private readonly failedLoginWindows = new Map<string, FailedLoginWindow>();

  constructor(
    private readonly auditService: AuditService,
    private readonly securityAuditLogger: SecurityAuditLogger,
  ) {}

  recordFailedLoginAttempt(tenantId: string, identifier: string, context: Record<string, unknown> = {}): void {
    const key = `${tenantId}:${identifier}`;
    const now = Date.now();
    const window = this.failedLoginWindows.get(key) ?? { attempts: [] };
    window.attempts = window.attempts.filter((t) => now - t < FAILED_LOGIN_WINDOW_MS);
    window.attempts.push(now);
    this.failedLoginWindows.set(key, window);

    if (window.attempts.length >= FAILED_LOGIN_THRESHOLD) {
      window.attempts = []; // reset so we don't re-alert on every subsequent attempt
      this.raise(
        tenantId,
        `Multiple failed login attempts for "${identifier}" (${FAILED_LOGIN_THRESHOLD}+ within 15 minutes)`,
        'auth',
        undefined,
        identifier,
        context,
      );
      this.securityAuditLogger.log({
        type: 'FAILED_AUTH',
        tenantId,
        correlationId: context.correlationId as string | undefined,
        details: { identifier, thresholdExceeded: FAILED_LOGIN_THRESHOLD },
      });
    }
  }

  recordPrivilegeChange(
    tenantId: string,
    actorId: string,
    targetUserId: string,
    changeType: 'ROLE_CHANGE' | 'PERMISSION_CHANGE',
    context: Record<string, unknown> = {},
  ): void {
    this.raise(
      tenantId,
      `Privilege escalation risk: ${changeType} on user ${targetUserId} by ${actorId}`,
      'authorization',
      actorId,
      targetUserId,
      context,
    );
    this.securityAuditLogger.log({
      type: 'PERMISSION_DENIED', // closest existing AuditEventType; a dedicated PRIVILEGE_CHANGE type is a small follow-up to SecurityAuditLogger's own union, out of scope for this milestone to modify
      tenantId,
      correlationId: context.correlationId as string | undefined,
      details: { changeType, actorId, targetUserId },
    });
  }

  recordConfigChange(tenantId: string, actorId: string, configKey: string, context: Record<string, unknown> = {}): void {
    this.raise(
      tenantId,
      `Configuration changed: "${configKey}" by ${actorId}`,
      'configuration',
      actorId,
      configKey,
      context,
    );
  }

  /** General-purpose entry point for any other module to raise a security-relevant alert without going through the specific helpers above. */
  recordSecurityEvent(tenantId: string, message: string, module: string, actorId?: string, context: Record<string, unknown> = {}): void {
    this.raise(tenantId, message, module, actorId, undefined, context);
  }

  private raise(
    tenantId: string,
    message: string,
    module: string,
    actorId: string | undefined,
    entityId: string | undefined,
    context: Record<string, unknown>,
  ): void {
    this.auditService.record({
      tenantId,
      category: AuditCategory.SECURITY,
      action: AuditActionType.CUSTOM,
      severity: AuditSeverity.CRITICAL,
      module,
      actorId,
      entityId,
      message,
      metadata: context,
    });
  }
}
