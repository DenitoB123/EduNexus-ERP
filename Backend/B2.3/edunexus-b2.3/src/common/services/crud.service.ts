/**
 * crud.service.ts
 *
 * B2.3 — Generic Service Layer — Base Service Classes
 *
 * The canonical generic service. Extends ReadOnlyService with full write
 * support (create/update/delete/batch/upsert), wiring together:
 *   - pre-create/pre-update/pre-delete validation (ValidationPipeline)
 *   - business rule execution (BusinessRulesEngine)
 *   - lifecycle hooks (before/after Create/Update/Delete)
 *   - tenant scoping + tenant validation
 *   - audit field population
 *   - transactional execution for batch operations
 *   - domain event publishing
 *
 * Business modules (B3+) extend this class per entity and get a fully
 * functional, enterprise-grade service with a handful of lines:
 *
 *   @Injectable()
 *   export class StudentService extends CrudService<Student, CreateStudentDto, UpdateStudentDto> {
 *     constructor(...deps) { super('Student', repository, deps); }
 *   }
 */

import { ICrudService } from '../interfaces/service.interfaces';
import { IRequestContext } from '../interfaces/context.interfaces';
import { IBaseRepository } from '../interfaces/repository.interfaces';
import { ReadOnlyService } from './read-only.service';
import { IBaseServiceDependencies } from './base.service';
import { BulkOperationResponse, IBulkOperationError } from '../responses/service-response';

export abstract class CrudService<TEntity, TCreateDto = Partial<TEntity>, TUpdateDto = Partial<TEntity>, TId = string>
  extends ReadOnlyService<TEntity, TId>
  implements ICrudService<TEntity, TCreateDto, TUpdateDto, TId>
{
  protected constructor(
    entityName: string,
    repository: IBaseRepository<TEntity, TId>,
    deps: IBaseServiceDependencies<TEntity> = {},
  ) {
    super(entityName, repository, deps);
  }

  // ---------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------

  async create(data: TCreateDto, context: IRequestContext): Promise<TEntity> {
    this.logExecution('create', { data });

    await this.runValidation('preCreate', data, context);
    await this.runValidation('duplicate', data, context);
    await this.runValidation('tenant', data, context);
    await this.runValidation('permission', data, context);
    await this.runBusinessRules('create', data, context);

    let prepared = (await this.beforeCreate?.(data as unknown as Partial<TEntity>, context)) ?? (data as unknown as Partial<TEntity>);
    prepared = this.applyTenantScopeToPayload(prepared, context);
    prepared = this.auditableService.applyCreateAuditFields(prepared as Record<string, unknown>, context) as Partial<TEntity>;

    const entity = await this.withTransaction(() => this.repository.create(prepared, context.tenant.tenantId));

    await this.afterCreate?.(entity, context);
    await this.publishEvent('create', this.extractId(entity), entity, context);

    return entity;
  }

  async createMany(data: TCreateDto[], context: IRequestContext): Promise<TEntity[]> {
    this.logExecution('createMany', { count: data.length });
    return this.withTransaction(async () => {
      const results: TEntity[] = [];
      for (const item of data) {
        results.push(await this.create(item, context));
      }
      return results;
    });
  }

  /** Non-transactional-per-item batch create that collects per-item failures instead of aborting the whole batch. Use createMany() when all-or-nothing is required. */
  async createManyTolerant(data: TCreateDto[], context: IRequestContext): Promise<BulkOperationResponse<TEntity>> {
    const results: TEntity[] = [];
    const errors: IBulkOperationError[] = [];
    for (let i = 0; i < data.length; i++) {
      try {
        results.push(await this.create(data[i], context));
      } catch (error) {
        errors.push({ index: i, message: error instanceof Error ? error.message : String(error) });
      }
    }
    return new BulkOperationResponse<TEntity>(results, errors, data.length);
  }

  // ---------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------

  async update(id: TId, data: TUpdateDto, context: IRequestContext): Promise<TEntity> {
    this.logExecution('update', { id, data });

    const existing = await this.findByIdOrThrow(id, context);
    await this.validateTenantAccess(context, this.extractTenantId(existing));

    await this.runValidation('preUpdate', data, context);
    await this.runBusinessRules('update', { id, data, existing }, context);

    let prepared =
      (await this.beforeUpdate?.(id, data as unknown as Partial<TEntity>, existing, context)) ??
      (data as unknown as Partial<TEntity>);
    prepared = this.auditableService.applyUpdateAuditFields(prepared as Record<string, unknown>, context) as Partial<TEntity>;

    const updated = await this.withTransaction(() => this.repository.update(id, prepared, context.tenant.tenantId));

    await this.afterUpdate?.(updated, existing, context);
    await this.publishEvent('update', id, updated, context, existing);

    return updated;
  }

  async updateMany(
    where: Record<string, unknown>,
    data: TUpdateDto,
    context: IRequestContext,
  ): Promise<{ count: number }> {
    this.logExecution('updateMany', { where, data });
    const scopedWhere = this.applyTenantScope(where, context);
    const prepared = this.auditableService.applyUpdateAuditFields(
      data as unknown as Record<string, unknown>,
      context,
    ) as Partial<TEntity>;
    return this.withTransaction(() => this.repository.updateMany(scopedWhere, prepared, context.tenant.tenantId));
  }

  async upsert(
    where: Record<string, unknown>,
    createData: TCreateDto,
    updateData: TUpdateDto,
    context: IRequestContext,
  ): Promise<TEntity> {
    this.logExecution('upsert', { where });
    const scopedWhere = this.applyTenantScope(where, context);

    const preparedCreate = this.auditableService.applyCreateAuditFields(
      this.applyTenantScopeToPayload(createData as unknown as Partial<TEntity>, context) as Record<string, unknown>,
      context,
    ) as Partial<TEntity>;
    const preparedUpdate = this.auditableService.applyUpdateAuditFields(
      updateData as unknown as Record<string, unknown>,
      context,
    ) as Partial<TEntity>;

    const entity = await this.withTransaction(() =>
      this.repository.upsert(scopedWhere, preparedCreate, preparedUpdate, context.tenant.tenantId),
    );

    await this.publishEvent('update', this.extractId(entity), entity, context);
    return entity;
  }

  // ---------------------------------------------------------------------
  // Delete (hard delete — see SoftDeleteService for soft-delete/restore)
  // ---------------------------------------------------------------------

  async delete(id: TId, context: IRequestContext): Promise<TEntity> {
    this.logExecution('delete', { id });

    const existing = await this.findByIdOrThrow(id, context);
    await this.validateTenantAccess(context, this.extractTenantId(existing));

    await this.runValidation('preDelete', { id, existing }, context);
    await this.runBusinessRules('delete', { id, existing }, context);

    await this.beforeDelete?.(id, existing, context);
    const deleted = await this.withTransaction(() => this.repository.delete(id, context.tenant.tenantId));
    await this.afterDelete?.(deleted, context);
    await this.publishEvent('delete', id, deleted, context, existing);

    return deleted;
  }

  async deleteMany(where: Record<string, unknown>, context: IRequestContext): Promise<{ count: number }> {
    this.logExecution('deleteMany', { where });
    const scopedWhere = this.applyTenantScope(where, context);
    return this.withTransaction(() => this.repository.deleteMany(scopedWhere, context.tenant.tenantId));
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  protected applyTenantScopeToPayload(payload: Partial<TEntity>, context: IRequestContext): Partial<TEntity> {
    if (context.tenant.isCrossTenantOperation) {
      return payload;
    }
    return {
      ...payload,
      tenantId: context.tenant.tenantId,
      ...(context.tenant.schoolId ? { schoolId: context.tenant.schoolId } : {}),
      ...(context.tenant.campusId ? { campusId: context.tenant.campusId } : {}),
    } as Partial<TEntity>;
  }

  /** Extracts an entity's id field. Assumes a conventional `id` property; override for entities with a different key. */
  protected extractId(entity: TEntity): TId {
    return (entity as unknown as { id: TId }).id;
  }

  /** Extracts an entity's tenantId field, if present, for tenant-access validation. Override if the field name differs. */
  protected extractTenantId(entity: TEntity): string | undefined {
    return (entity as unknown as { tenantId?: string }).tenantId;
  }
}
