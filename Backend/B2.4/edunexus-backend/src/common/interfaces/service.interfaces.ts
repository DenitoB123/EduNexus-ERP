/**
 * service.interfaces.ts
 *
 * B2.3 — Generic Service Layer
 *
 * Reusable service-layer interfaces that every future EduNexus business
 * module (B3 onward) should implement by extending the base service classes
 * in ../services/*, rather than declaring these directly.
 */

import { ServiceResponse } from '../responses/service-response';
import {
  IPaginatedResult,
  IFindManyOptions,
  IPaginationOptions,
  ICursorPaginationOptions,
  ICursorPaginatedResult,
} from './repository.interfaces';
import { IRequestContext } from './context.interfaces';

export interface IReadService<TEntity, TId = string> {
  findById(id: TId, context: IRequestContext): Promise<TEntity | null>;
  findOne(options: IFindManyOptions<TEntity>, context: IRequestContext): Promise<TEntity | null>;
  findMany(options: IFindManyOptions<TEntity>, context: IRequestContext): Promise<TEntity[]>;
  findManyPaginated(
    options: IFindManyOptions<TEntity>,
    pagination: IPaginationOptions,
    context: IRequestContext,
  ): Promise<IPaginatedResult<TEntity>>;
  /** Keyset/cursor pagination — falls back to an offset-pagination-derived result if the repository doesn't implement cursor support. See ReadOnlyService. */
  findManyCursorPaginated(
    options: IFindManyOptions<TEntity>,
    pagination: ICursorPaginationOptions,
    context: IRequestContext,
  ): Promise<ICursorPaginatedResult<TEntity>>;
  exists(where: Record<string, unknown>, context: IRequestContext): Promise<boolean>;
  count(where: Record<string, unknown> | undefined, context: IRequestContext): Promise<number>;
}

export interface IWriteService<TEntity, TCreateDto = Partial<TEntity>, TUpdateDto = Partial<TEntity>, TId = string> {
  create(data: TCreateDto, context: IRequestContext): Promise<TEntity>;
  createMany(data: TCreateDto[], context: IRequestContext): Promise<TEntity[]>;
  update(id: TId, data: TUpdateDto, context: IRequestContext): Promise<TEntity>;
  updateMany(
    where: Record<string, unknown>,
    data: TUpdateDto,
    context: IRequestContext,
  ): Promise<{ count: number }>;
  upsert(
    where: Record<string, unknown>,
    createData: TCreateDto,
    updateData: TUpdateDto,
    context: IRequestContext,
  ): Promise<TEntity>;
  delete(id: TId, context: IRequestContext): Promise<TEntity>;
  deleteMany(where: Record<string, unknown>, context: IRequestContext): Promise<{ count: number }>;
}

export interface ICrudService<TEntity, TCreateDto = Partial<TEntity>, TUpdateDto = Partial<TEntity>, TId = string>
  extends IReadService<TEntity, TId>,
    IWriteService<TEntity, TCreateDto, TUpdateDto, TId> {}

export interface ITenantService {
  /** Validates that the operation is permitted within the given tenant scope. Throws on violation. */
  validateTenantAccess(context: IRequestContext, resourceTenantId?: string): void | Promise<void>;

  /** Applies tenant scoping to a where-clause / options object before it reaches the repository. */
  applyTenantScope<T extends Record<string, unknown>>(where: T, context: IRequestContext): T;
}

export interface ISoftDeleteService<TEntity, TId = string> {
  softDelete(id: TId, context: IRequestContext): Promise<TEntity>;
  restore(id: TId, context: IRequestContext): Promise<TEntity>;
}

export interface IAuditableService<TEntity> {
  applyCreateAuditFields<T extends Record<string, unknown>>(data: T, context: IRequestContext): T;
  applyUpdateAuditFields<T extends Record<string, unknown>>(data: T, context: IRequestContext): T;
  applyDeleteAuditFields<T extends Record<string, unknown>>(data: T, context: IRequestContext): T;
  applyRestoreAuditFields<T extends Record<string, unknown>>(data: T, context: IRequestContext): T;
}

/**
 * Umbrella interface combining the full generic-service capability set.
 * CrudService (see ../services/crud.service.ts) is the canonical implementation.
 */
export interface IService<TEntity, TCreateDto = Partial<TEntity>, TUpdateDto = Partial<TEntity>, TId = string>
  extends ICrudService<TEntity, TCreateDto, TUpdateDto, TId>,
    ITenantService,
    ISoftDeleteService<TEntity, TId>,
    IAuditableService<TEntity> {}

/** Response-wrapped variant, useful for controllers that want ServiceResponse<T> rather than raw entities. */
export interface IServiceResponseCrud<TEntity, TCreateDto = Partial<TEntity>, TUpdateDto = Partial<TEntity>, TId = string> {
  create(data: TCreateDto, context: IRequestContext): Promise<ServiceResponse<TEntity>>;
  update(id: TId, data: TUpdateDto, context: IRequestContext): Promise<ServiceResponse<TEntity>>;
  delete(id: TId, context: IRequestContext): Promise<ServiceResponse<TEntity>>;
  findById(id: TId, context: IRequestContext): Promise<ServiceResponse<TEntity | null>>;
}
