/**
 * read-only.service.ts
 *
 * B2.3 — Generic Service Layer — Base Service Classes
 *
 * Read-only generic service: findById, findOne, findMany, findManyPaginated,
 * exists, count — all automatically tenant-scoped. Use for lookup/reference
 * data services that should never mutate state (e.g. a read model, a
 * reporting service, a reference-data lookup), or extend CrudService when
 * write operations are also needed.
 */

import { IReadService } from '../interfaces/service.interfaces';
import { IRequestContext } from '../interfaces/context.interfaces';
import {
  IFindManyOptions,
  IPaginationOptions,
  IPaginatedResult,
  ICursorPaginationOptions,
  ICursorPaginatedResult,
} from '../interfaces/repository.interfaces';
import { normalizePagination } from '../utils/pagination.util';
import { BaseService, IBaseServiceDependencies } from './base.service';
import { IBaseRepository } from '../interfaces/repository.interfaces';

export abstract class ReadOnlyService<TEntity, TId = string>
  extends BaseService<TEntity, TId>
  implements IReadService<TEntity, TId>
{
  protected constructor(
    entityName: string,
    repository: IBaseRepository<TEntity, TId>,
    deps: IBaseServiceDependencies<TEntity> = {},
  ) {
    super(entityName, repository, deps);
  }

  async findById(id: TId, context: IRequestContext): Promise<TEntity | null> {
    this.logExecution('findById', { id });
    return this.repository.findById(id, context.tenant.tenantId);
  }

  /** Same as findById but throws EntityNotFoundException (or the injected exceptionFactory equivalent) instead of returning null. */
  async findByIdOrThrow(id: TId, context: IRequestContext): Promise<TEntity> {
    const entity = await this.findById(id, context);
    if (!entity) {
      this.notFound(id);
    }
    return entity as TEntity;
  }

  async findOne(options: IFindManyOptions<TEntity>, context: IRequestContext): Promise<TEntity | null> {
    this.logExecution('findOne', { options });
    const scopedWhere = this.applyTenantScope(options.where ?? {}, context);
    return this.repository.findOne({ ...options, where: scopedWhere }, context.tenant.tenantId);
  }

  async findMany(options: IFindManyOptions<TEntity>, context: IRequestContext): Promise<TEntity[]> {
    this.logExecution('findMany', { options });
    const scopedWhere = this.applyTenantScope(options.where ?? {}, context);
    return this.repository.findMany({ ...options, where: scopedWhere }, context.tenant.tenantId);
  }

  async findManyPaginated(
    options: IFindManyOptions<TEntity>,
    pagination: IPaginationOptions,
    context: IRequestContext,
  ): Promise<IPaginatedResult<TEntity>> {
    const normalized = normalizePagination(pagination);
    this.logExecution('findManyPaginated', { options, pagination: normalized });
    const scopedWhere = this.applyTenantScope(options.where ?? {}, context);
    return this.repository.findManyPaginated({ ...options, where: scopedWhere }, normalized, context.tenant.tenantId);
  }

  async findManyCursorPaginated(
    options: IFindManyOptions<TEntity>,
    pagination: ICursorPaginationOptions,
    context: IRequestContext,
  ): Promise<ICursorPaginatedResult<TEntity>> {
    this.logExecution('findManyCursorPaginated', { options, pagination });
    const scopedWhere = this.applyTenantScope(options.where ?? {}, context);
    const scopedOptions = { ...options, where: scopedWhere };

    if (this.repository.findManyCursorPaginated) {
      return this.repository.findManyCursorPaginated(scopedOptions, pagination, context.tenant.tenantId);
    }

    // Fallback: repository doesn't implement native keyset pagination.
    // Emulate cursor semantics over take+1 using findMany, so callers of
    // this method get a consistent contract regardless of repository
    // capability. Not as efficient as a true keyset query, but correct.
    const take = pagination.take;
    const items = await this.repository.findMany(
      { ...scopedOptions, cursor: pagination.cursor, take: take + 1 },
      context.tenant.tenantId,
    );
    const hasMore = items.length > take;
    const page = hasMore ? items.slice(0, take) : items;
    const last = page[page.length - 1] as unknown as { id?: unknown } | undefined;
    return {
      items: page,
      hasMore,
      nextCursor: hasMore && last?.id !== undefined ? { id: last.id } : null,
    };
  }

  async exists(where: Record<string, unknown>, context: IRequestContext): Promise<boolean> {
    const scopedWhere = this.applyTenantScope(where, context);
    return this.repository.exists(scopedWhere, context.tenant.tenantId);
  }

  async count(where: Record<string, unknown> | undefined, context: IRequestContext): Promise<number> {
    const scopedWhere = this.applyTenantScope(where ?? {}, context);
    return this.repository.count(scopedWhere, context.tenant.tenantId);
  }
}
