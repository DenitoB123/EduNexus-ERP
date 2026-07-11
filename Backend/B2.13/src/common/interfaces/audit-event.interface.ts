/**
 * audit-event.interface.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 */

export enum AuditActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  FAILED_LOGIN = 'FAILED_LOGIN',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  ROLE_CHANGE = 'ROLE_CHANGE',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  API_CALL = 'API_CALL',
  FILE_OPERATION = 'FILE_OPERATION',
  CUSTOM = 'CUSTOM',
}

export enum AuditCategory {
  DATA_CHANGE = 'DATA_CHANGE',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  ADMINISTRATION = 'ADMINISTRATION',
  SYSTEM = 'SYSTEM',
  API = 'API',
  FILE = 'FILE',
  SECURITY = 'SECURITY',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export interface IAuditEvent {
  id: string;
  tenantId: string;
  category: AuditCategory;
  action: AuditActionType;
  severity: AuditSeverity;
  module: string;
  entityType?: string | null;
  entityId?: string | null;
  actorId?: string | null;
  actorType: string;
  correlationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  statusCode?: number | null;
  durationMs?: number | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  legalHoldExempt: boolean;
  occurredAt: Date;
}

/** Input shape for recording a new event — everything server-generated (id, occurredAt) is omitted. */
export type RecordAuditEventInput = Omit<IAuditEvent, 'id' | 'occurredAt' | 'legalHoldExempt' | 'actorType'> & {
  actorType?: string;
  legalHoldExempt?: boolean;
};

export interface IEntityChangeLog {
  id: string;
  tenantId: string;
  auditEventId?: string | null;
  entityType: string;
  entityId: string;
  changedFields: string[];
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  actorId?: string | null;
  correlationId?: string | null;
  occurredAt: Date;
}

export type RecordEntityChangeInput = Omit<IEntityChangeLog, 'id' | 'occurredAt'>;
