/**
 * auditable.service.ts
 *
 * B2.3 — Generic Service Layer — Base Service Classes
 *
 * Standalone, composable implementation of IAuditableService. BaseService
 * composes an instance of this so audit fields (createdBy/updatedBy/
 * deletedBy/restoredBy + timestamps) are populated consistently for every
 * generic/business service, without each module writing this logic itself.
 *
 * If a more sophisticated audit strategy exists in the shared Auditing
 * infrastructure (e.g. writing to a separate audit-log table, capturing
 * field-level diffs), it can be supplied via the optional
 * AUDIT_FIELD_STRATEGY token; this class falls back to direct field
 * assignment on the entity payload when no strategy is provided.
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { IAuditableService } from '../interfaces/service.interfaces';
import { IRequestContext, IAuditFields } from '../interfaces/context.interfaces';
import { AUDIT_FIELD_STRATEGY } from '../interfaces/tokens';

/** Extension point for a richer audit strategy (e.g. writing an audit-log entry in addition to inline fields). */
export interface IAuditFieldStrategy {
  onCreate?<T extends Record<string, unknown>>(data: T, context: IRequestContext): T;
  onUpdate?<T extends Record<string, unknown>>(data: T, context: IRequestContext): T;
  onDelete?<T extends Record<string, unknown>>(data: T, context: IRequestContext): T;
  onRestore?<T extends Record<string, unknown>>(data: T, context: IRequestContext): T;
}

@Injectable()
export class AuditableService<TEntity = unknown> implements IAuditableService<TEntity> {
  constructor(@Optional() @Inject(AUDIT_FIELD_STRATEGY) private readonly strategy?: IAuditFieldStrategy) {}

  applyCreateAuditFields<T extends Record<string, unknown>>(data: T, context: IRequestContext): T {
    if (this.strategy?.onCreate) {
      return this.strategy.onCreate(data, context);
    }
    const fields: IAuditFields = {
      createdAt: new Date(),
      createdBy: context.actor.userId,
      updatedAt: new Date(),
      updatedBy: context.actor.userId,
    };
    return { ...data, ...fields } as T;
  }

  applyUpdateAuditFields<T extends Record<string, unknown>>(data: T, context: IRequestContext): T {
    if (this.strategy?.onUpdate) {
      return this.strategy.onUpdate(data, context);
    }
    const fields: Pick<IAuditFields, 'updatedAt' | 'updatedBy'> = {
      updatedAt: new Date(),
      updatedBy: context.actor.userId,
    };
    return { ...data, ...fields } as T;
  }

  applyDeleteAuditFields<T extends Record<string, unknown>>(data: T, context: IRequestContext): T {
    if (this.strategy?.onDelete) {
      return this.strategy.onDelete(data, context);
    }
    const fields: Pick<IAuditFields, 'deletedAt' | 'deletedBy'> = {
      deletedAt: new Date(),
      deletedBy: context.actor.userId,
    };
    return { ...data, ...fields } as T;
  }

  applyRestoreAuditFields<T extends Record<string, unknown>>(data: T, context: IRequestContext): T {
    if (this.strategy?.onRestore) {
      return this.strategy.onRestore(data, context);
    }
    const fields: Pick<IAuditFields, 'deletedAt' | 'deletedBy' | 'restoredAt' | 'restoredBy'> = {
      deletedAt: null,
      deletedBy: null,
      restoredAt: new Date(),
      restoredBy: context.actor.userId,
    };
    return { ...data, ...fields } as T;
  }
}
