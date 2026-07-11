/**
 * activity-logger.service.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 */

import { Injectable } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditAlertService } from './audit-alert.service';
import { IActivityLogger } from '../interfaces/audit-service.interface';
import { AuditActionType, AuditCategory, AuditSeverity } from '../interfaces/audit-event.interface';

@Injectable()
export class ActivityLoggerService implements IActivityLogger {
  constructor(
    private readonly auditService: AuditService,
    private readonly alertService: AuditAlertService,
  ) {}

  logLogin(tenantId: string, actorId: string, context: Record<string, unknown> = {}): void {
    this.auditService.record({
      tenantId,
      category: AuditCategory.AUTHENTICATION,
      action: AuditActionType.LOGIN,
      severity: AuditSeverity.INFO,
      module: 'auth',
      actorId,
      metadata: context,
    });
  }

  logLogout(tenantId: string, actorId: string, context: Record<string, unknown> = {}): void {
    this.auditService.record({
      tenantId,
      category: AuditCategory.AUTHENTICATION,
      action: AuditActionType.LOGOUT,
      severity: AuditSeverity.INFO,
      module: 'auth',
      actorId,
      metadata: context,
    });
  }

  logFailedLogin(tenantId: string, identifier: string, context: Record<string, unknown> = {}): void {
    this.auditService.record({
      tenantId,
      category: AuditCategory.AUTHENTICATION,
      action: AuditActionType.FAILED_LOGIN,
      severity: AuditSeverity.WARNING,
      module: 'auth',
      actorId: identifier,
      metadata: context,
    });
    // Multiple-failed-login detection is the Alert Framework's job, not
    // duplicated here — this just feeds it the signal.
    this.alertService.recordFailedLoginAttempt(tenantId, identifier, context);
  }

  logPasswordChange(tenantId: string, actorId: string, context: Record<string, unknown> = {}): void {
    this.auditService.record({
      tenantId,
      category: AuditCategory.AUTHENTICATION,
      action: AuditActionType.PASSWORD_CHANGE,
      severity: AuditSeverity.WARNING,
      module: 'auth',
      actorId,
      metadata: context,
    });
  }

  logPermissionChange(tenantId: string, actorId: string, targetUserId: string, context: Record<string, unknown> = {}): void {
    this.auditService.record({
      tenantId,
      category: AuditCategory.AUTHORIZATION,
      action: AuditActionType.PERMISSION_CHANGE,
      severity: AuditSeverity.CRITICAL,
      module: 'authorization',
      actorId,
      entityType: 'User',
      entityId: targetUserId,
      metadata: context,
    });
    this.alertService.recordPrivilegeChange(tenantId, actorId, targetUserId, 'PERMISSION_CHANGE', context);
  }

  logRoleChange(tenantId: string, actorId: string, targetUserId: string, context: Record<string, unknown> = {}): void {
    this.auditService.record({
      tenantId,
      category: AuditCategory.AUTHORIZATION,
      action: AuditActionType.ROLE_CHANGE,
      severity: AuditSeverity.CRITICAL,
      module: 'authorization',
      actorId,
      entityType: 'User',
      entityId: targetUserId,
      metadata: context,
    });
    this.alertService.recordPrivilegeChange(tenantId, actorId, targetUserId, 'ROLE_CHANGE', context);
  }

  logConfigChange(tenantId: string, actorId: string, configKey: string, context: Record<string, unknown> = {}): void {
    this.auditService.record({
      tenantId,
      category: AuditCategory.ADMINISTRATION,
      action: AuditActionType.CONFIG_CHANGE,
      severity: AuditSeverity.WARNING,
      module: 'configuration',
      actorId,
      entityType: 'SystemSetting',
      entityId: configKey,
      metadata: context,
    });
    this.alertService.recordConfigChange(tenantId, actorId, configKey, context);
  }

  logApiCall(tenantId: string, actorId: string | undefined, module: string, context: Record<string, unknown> = {}): void {
    this.auditService.record({
      tenantId,
      category: AuditCategory.API,
      action: AuditActionType.API_CALL,
      severity: AuditSeverity.INFO,
      module,
      actorId,
      metadata: context,
    });
  }

  logFileOperation(tenantId: string, actorId: string | undefined, operation: string, context: Record<string, unknown> = {}): void {
    this.auditService.record({
      tenantId,
      category: AuditCategory.FILE,
      action: AuditActionType.FILE_OPERATION,
      severity: AuditSeverity.INFO,
      module: 'file-management',
      actorId,
      message: operation,
      metadata: context,
    });
  }
}
