/**
 * soft-delete.service.ts
 *
 * B2.3 — Generic Service Layer — Base Service Classes
 *
 * Extends CrudService for entities that support soft deletion. Overrides
 * `delete()` to perform a soft delete (via repository.softDelete) rather
 * than a hard delete, and adds `restore()`. Hard delete remains available
 * via `hardDelete()` for administrative/cleanup use cases.
 *
 * Business modules for entities with a `deletedAt`/`deletedBy` column
 * (the vast majority of EduNexus domain entities, per the auditing
 * infrastructure) should extend this instead of CrudService directly.
 */

import { IRequestContext } from '../interfaces/context.interfaces';
import { IBaseRepository } from '../interfaces/repository.interfaces';
import { ISoftDeleteService } from '../interfaces/service.interfaces';
import { CrudService } from './crud.service';
import { IBaseServiceDependencies } from './base.service';

export abstract class SoftDeleteService<TEntity, TCreateDto = Partial<TEntity>, TUpdateDto = Partial<TEntity>, TId = string>
  extends CrudService<TEntity, TCreateDto, TUpdateDto, TId>
  implements ISoftDeleteService<TEntity, TId>
{
  protected constructor(
    entityName: string,
    repository: IBaseRepository<TEntity, TId>,
    deps: IBaseServiceDependencies<TEntity> = {},
  ) {
    super(entityName, repository, deps);
  }

  /** Soft delete: the default `delete()` behavior for this class. */
  override async delete(id: TId, context: IRequestContext): Promise<TEntity> {
    return this.softDelete(id, context);
  }

  async softDelete(id: TId, context: IRequestContext): Promise<TEntity> {
    this.logExecution('softDelete', { id });

    const existing = await this.findByIdOrThrow(id, context);
    await this.validateTenantAccess(context, this.extractTenantId(existing));

    await this.runValidation('preDelete', { id, existing }, context);
    await this.runBusinessRules('softDelete', { id, existing }, context);

    await this.beforeDelete?.(id, existing, context);
    const deleted = await this.withTransaction(() =>
      this.repository.softDelete(id, context.actor.userId, context.tenant.tenantId),
    );
    await this.afterDelete?.(deleted, context);
    await this.publishEvent('softDelete', id, deleted, context, existing);

    return deleted;
  }

  async restore(id: TId, context: IRequestContext): Promise<TEntity> {
    this.logExecution('restore', { id });

    const existing = await this.repository.findById(id, context.tenant.tenantId, { withDeleted: true });
    if (!existing) {
      this.notFound(id);
    }
    await this.validateTenantAccess(context, this.extractTenantId(existing as TEntity));

    await this.runBusinessRules('restore', { id, existing }, context);

    await this.beforeRestore?.(id, existing as TEntity, context);
    const restored = await this.withTransaction(() =>
      this.repository.restore(id, context.actor.userId, context.tenant.tenantId),
    );
    await this.afterRestore?.(restored, context);
    await this.publishEvent('restore', id, restored, context, existing as TEntity);

    return restored;
  }

  /** Permanently deletes the record, bypassing soft delete. Intended for admin/cleanup flows only — apply permission validation accordingly. */
  async hardDelete(id: TId, context: IRequestContext): Promise<TEntity> {
    this.logExecution('hardDelete', { id });
    const existing = await this.findByIdOrThrow(id, context);
    await this.validateTenantAccess(context, this.extractTenantId(existing));

    await this.beforeDelete?.(id, existing, context);
    const deleted = await this.withTransaction(() => this.repository.delete(id, context.tenant.tenantId));
    await this.afterDelete?.(deleted, context);
    await this.publishEvent('delete', id, deleted, context, existing);

    return deleted;
  }
}
