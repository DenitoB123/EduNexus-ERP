/**
 * compliance.interface.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 */

import { AuditCategory } from './audit-event.interface';

export interface IRetentionPolicy {
  id: string;
  tenantId: string;
  category: AuditCategory;
  retentionDays: number;
  isActive: boolean;
  description?: string | null;
}

export interface ILegalHold {
  id: string;
  tenantId: string;
  entityType?: string | null;
  entityId?: string | null;
  reason: string;
  isActive: boolean;
  releasedAt?: Date | null;
  releasedBy?: string | null;
}

export interface IPurgeResult {
  category: AuditCategory;
  auditEventsDeleted: number;
  entityChangeLogsDeleted: number;
  skippedDueToLegalHold: number;
}

export interface IComplianceService {
  setRetentionPolicy(tenantId: string, category: AuditCategory, retentionDays: number, actorId?: string): Promise<IRetentionPolicy>;
  getRetentionPolicy(tenantId: string, category: AuditCategory): Promise<IRetentionPolicy | null>;
  placeLegalHold(tenantId: string, reason: string, entityType?: string, entityId?: string, actorId?: string): Promise<ILegalHold>;
  releaseLegalHold(tenantId: string, holdId: string, actorId?: string): Promise<ILegalHold>;
  isUnderLegalHold(tenantId: string, entityType: string, entityId: string): Promise<boolean>;
  /** Deletes AuditEvent/EntityChangeLog rows older than each category's retention policy, skipping anything under legal hold. */
  purgeExpired(tenantId: string): Promise<IPurgeResult[]>;
}
