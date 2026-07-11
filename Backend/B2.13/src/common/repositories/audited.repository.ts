/**
 * audited.repository.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 *
 * Extends `SoftDeleteRepository` (the top of this codebase's canonical
 * repository hierarchy — see soft-delete.repository.ts's own header
 * comment on which business modules should extend it) to additionally
 * emit entity-history records on create/update/softDelete/restore,
 * automatically — this is what satisfies "Automatic Audit Capture ...
 * without requiring manual implementation in every module" for entity
 * CRUD specifically. AuditInterceptor (common/interceptors/audit.interceptor.ts)
 * separately covers API-call-level events; this covers the actual data
 * diffs, which only the repository layer has enough information to
 * compute correctly.
 *
 * A future business module extends `AuditedRepository<T>` in place of
 * `SoftDeleteRepository<T>` and gets change tracking for free — no
 * change to how it calls create/update/softDelete/restore.
 */

import { SoftDeleteRepository } from './soft-delete.repository';
import { PrismaFullModelDelegate } from './interfaces/prisma-full-delegate.interface';
import { EntityHistoryService } from '../audit/entity-history.service';
import { EntityDiffUtil } from '../utils/entity-diff.util';

export abstract class AuditedRepository<T extends { id: string }> extends SoftDeleteRepository<T> {
  protected constructor(
    delegate: PrismaFullModelDelegate<T>,
    private readonly entityHistoryService: EntityHistoryService,
  ) {
    super(delegate);
  }

  async create(data: Partial<T>, tenantId: string, actorId?: string): Promise<T> {
    const created = await super.create(data, tenantId, actorId);
    const diff = EntityDiffUtil.diff({}, created as unknown as Record<string, unknown>);
    this.entityHistoryService.recordChange({
      tenantId,
      entityType: this.modelName,
      entityId: created.id,
      changedFields: diff.changedFields,
      previousValues: null,
      newValues: diff.newValues,
      actorId,
    });
    return created;
  }

  async update(id: string, data: Partial<T>, tenantId: string, actorId?: string): Promise<T> {
    const before = await this.findById(id, tenantId);
    const updated = await super.update(id, data, tenantId, actorId);
    const diff = EntityDiffUtil.diff(
      (before as unknown as Record<string, unknown>) ?? {},
      updated as unknown as Record<string, unknown>,
    );

    if (diff.changedFields.length > 0) {
      this.entityHistoryService.recordChange({
        tenantId,
        entityType: this.modelName,
        entityId: id,
        changedFields: diff.changedFields,
        previousValues: diff.previousValues,
        newValues: diff.newValues,
        actorId,
      });
    }

    return updated;
  }

  async softDelete(id: string, tenantId: string, actorId?: string): Promise<T> {
    const deleted = await super.softDelete(id, tenantId, actorId);
    this.entityHistoryService.recordChange({
      tenantId,
      entityType: this.modelName,
      entityId: id,
      changedFields: ['deletedAt', 'deletedBy'],
      previousValues: { deletedAt: null },
      newValues: { deletedAt: (deleted as unknown as { deletedAt: unknown }).deletedAt },
      actorId,
    });
    return deleted;
  }

  async restore(id: string, tenantId: string, actorId?: string): Promise<T> {
    const restored = await super.restore(id, tenantId, actorId);
    this.entityHistoryService.recordChange({
      tenantId,
      entityType: this.modelName,
      entityId: id,
      changedFields: ['deletedAt', 'deletedBy'],
      previousValues: { deletedAt: 'previously set' },
      newValues: { deletedAt: null },
      actorId,
    });
    return restored;
  }
}
