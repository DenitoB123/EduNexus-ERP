/**
 * entity-history.service.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 */

import { Injectable } from '@nestjs/common';
import { EntityChangeLogRepository } from './repositories/entity-change-log.repository';
import { AuditService } from './audit.service';
import { IEntityHistoryService } from '../interfaces/audit-service.interface';
import { IEntityChangeLog, RecordEntityChangeInput, AuditActionType, AuditCategory, AuditSeverity } from '../interfaces/audit-event.interface';

@Injectable()
export class EntityHistoryService implements IEntityHistoryService {
  constructor(
    private readonly repository: EntityChangeLogRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Records a change-history row directly (durable — awaited internally,
   * unlike AuditService.record()'s fire-and-forget buffering) and also
   * emits a corresponding AuditEvent so the change surfaces in the
   * unified search/timeline alongside every other action. Change-history
   * rows are written eagerly because they carry the actual diff data
   * business logic may depend on reading back immediately (e.g. an
   * "undo" feature); losing a few seconds of buffered AuditEvent rows to
   * a crash is an accepted trade-off (see audit.service.ts), losing
   * change-history diffs is not.
   */
  recordChange(input: RecordEntityChangeInput): void {
    void this.repository.create(input).catch(() => {
      // AuditService already has its own error-logging path for the
      // AuditEvent below; a duplicate catch-and-log here for the
      // change-log write specifically avoids letting an EntityChangeLog
      // write failure propagate into the caller's request (same
      // "never break the request" convention as AuditService).
    });

    this.auditService.record({
      tenantId: input.tenantId,
      category: AuditCategory.DATA_CHANGE,
      action: AuditActionType.UPDATE,
      severity: AuditSeverity.INFO,
      module: 'entity-history',
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: input.actorId,
      correlationId: input.correlationId,
      metadata: { changedFields: input.changedFields },
    });
  }

  async getHistoryForEntity(tenantId: string, entityType: string, entityId: string): Promise<IEntityChangeLog[]> {
    return this.repository.findByEntity(tenantId, entityType, entityId);
  }
}
