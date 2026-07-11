/**
 * audit-service.interface.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 */

import { IAuditEvent, IEntityChangeLog, RecordAuditEventInput, RecordEntityChangeInput } from './audit-event.interface';

export interface IAuditSearchCriteria {
  tenantId: string;
  actorId?: string;
  action?: string;
  category?: string;
  entityType?: string;
  entityId?: string;
  module?: string;
  severity?: string;
  dateFrom?: Date;
  dateTo?: Date;
  correlationId?: string;
}

export interface IPagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * The single write path for the audit trail. Writes are fire-and-forget
 * from the caller's perspective (failures are logged, never thrown) — the
 * same convention the codebase's own predecessor AuditLogService used
 * (see schema.audit.additions.prisma's header note) — so a broken audit
 * write can never break the request that triggered it. Internally batches
 * writes rather than hitting the database once per call; see
 * audit.service.ts for the batching strategy.
 */
export interface IAuditService {
  record(input: RecordAuditEventInput): void;
  /** Forces any currently-buffered events to persist immediately — used on shutdown and by tests. */
  flush(): Promise<void>;
}

/** Convenience wrappers over IAuditService for the specific action types B2.13 requires automatic capture for. */
export interface IActivityLogger {
  logLogin(tenantId: string, actorId: string, context?: Record<string, unknown>): void;
  logLogout(tenantId: string, actorId: string, context?: Record<string, unknown>): void;
  logFailedLogin(tenantId: string, identifier: string, context?: Record<string, unknown>): void;
  logPasswordChange(tenantId: string, actorId: string, context?: Record<string, unknown>): void;
  logPermissionChange(tenantId: string, actorId: string, targetUserId: string, context?: Record<string, unknown>): void;
  logRoleChange(tenantId: string, actorId: string, targetUserId: string, context?: Record<string, unknown>): void;
  logConfigChange(tenantId: string, actorId: string, configKey: string, context?: Record<string, unknown>): void;
  logApiCall(tenantId: string, actorId: string | undefined, module: string, context?: Record<string, unknown>): void;
  logFileOperation(tenantId: string, actorId: string | undefined, operation: string, context?: Record<string, unknown>): void;
}

export interface IEntityHistoryService {
  recordChange(input: RecordEntityChangeInput): void;
  getHistoryForEntity(tenantId: string, entityType: string, entityId: string): Promise<IEntityChangeLog[]>;
}

export interface IAuditRepository {
  create(event: RecordAuditEventInput & { actorType: string; legalHoldExempt: boolean }): Promise<IAuditEvent>;
  createMany(events: (RecordAuditEventInput & { actorType: string; legalHoldExempt: boolean })[]): Promise<number>;
  search(criteria: IAuditSearchCriteria, page: number, pageSize: number): Promise<IPagedResult<IAuditEvent>>;
  findByCorrelationId(tenantId: string, correlationId: string): Promise<IAuditEvent[]>;
}
