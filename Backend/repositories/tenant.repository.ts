import { PaginatedResult, PaginationInput, QueryOptions } from '../../database/interfaces/base-model.interface';
import { TenantQueryHelper } from '../../database/helpers/tenant-query.helper';
import { PrismaRepository } from './prisma.repository';
import { IReadRepository } from './interfaces/read-repository.interface';
import { IWriteRepository } from './interfaces/write-repository.interface';
import { ISpecificationRepository } from './interfaces/specification-repository.interface';
import { ISpecification } from '../base/specification';
import { SpecificationQueryHelper } from './specification-query.helper';

/**
 * Adds mandatory tenant scoping on top of PrismaRepository. Every
 * method here injects `tenantId` into the Prisma `where` clause via
 * TenantQueryHelper (B1.2) — the same helper the tenant middleware's
 * AsyncLocalStorage-derived context ultimately feeds into — and every
 * write verifies the target row belongs to that tenant before
 * mutating it, so a caller can never read or write across tenant
 * boundaries even if it has a valid record ID from another tenant.
 */
export abstract class TenantRepository<T extends { id: string }>
  extends PrismaRepository<T>
  implements IReadRepository<T>, IWriteRepository<T, Partial<T>, Partial<T>>, ISpecificationRepository<T>
{
  async findById(id: string, tenantId: string): Promise<T | null> {
    return this.rawFindOne(TenantQueryHelper.scopeWhere({ id }, tenantId));
  }

  async findOne(options: QueryOptions, tenantId: string): Promise<T | null> {
    const where = TenantQueryHelper.excludeSoftDeleted(
      TenantQueryHelper.scopeWhere(this.buildWhere(options), tenantId),
      options.includeDeleted,
    );
    return this.rawFindOne(where);
  }

  async findMany(options: QueryOptions, tenantId: string): Promise<PaginatedResult<T>> {
    const extraWhere = TenantQueryHelper.excludeSoftDeleted(
      TenantQueryHelper.scopeWhere({}, tenantId),
      options.includeDeleted,
    );
    return this.rawFindMany(options, extraWhere);
  }

  async exists(id: string, tenantId: string): Promise<boolean> {
    return this.rawExists(TenantQueryHelper.scopeWhere({ id }, tenantId));
  }

  async count(options: QueryOptions, tenantId: string): Promise<number> {
    const extraWhere = TenantQueryHelper.excludeSoftDeleted(TenantQueryHelper.scopeWhere({}, tenantId));
    return this.rawCount(options, extraWhere);
  }

  async create(data: Partial<T>, tenantId: string): Promise<T> {
    return this.rawCreate({ ...data, tenantId } as Record<string, unknown>);
  }

  async update(id: string, data: Partial<T>, tenantId: string): Promise<T> {
    await this.assertBelongsToTenant(id, tenantId);
    return this.rawUpdate(TenantQueryHelper.scopeWhere({ id }, tenantId), data as Record<string, unknown>);
  }

  async upsert(id: string, createData: Partial<T>, updateData: Partial<T>, tenantId: string): Promise<T> {
    return this.rawUpsert(
      TenantQueryHelper.scopeWhere({ id }, tenantId),
      { ...createData, id, tenantId } as Record<string, unknown>,
      updateData as Record<string, unknown>,
    );
  }

  async batchCreate(items: Partial<T>[], tenantId: string): Promise<number> {
    return this.rawBatchCreate(items.map((item) => ({ ...item, tenantId }) as Record<string, unknown>));
  }

  async batchUpdate(ids: string[], data: Partial<T>, tenantId: string): Promise<number> {
    return this.rawBatchUpdate(
      TenantQueryHelper.scopeWhere({ id: { in: ids } }, tenantId),
      data as Record<string, unknown>,
    );
  }

  async batchDelete(ids: string[], tenantId: string): Promise<number> {
    return this.rawBatchDelete(TenantQueryHelper.scopeWhere({ id: { in: ids } }, tenantId));
  }

  async findBySpecification(
    spec: ISpecification<T>,
    tenantId: string,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<T>> {
    return SpecificationQueryHelper.findMany(this.delegate, spec, tenantId, pagination);
  }

  async countBySpecification(spec: ISpecification<T>, tenantId: string): Promise<number> {
    return SpecificationQueryHelper.count(this.delegate, spec, tenantId);
  }

  /**
   * Guards every tenant-scoped write: confirms the record exists
   * *and* belongs to the calling tenant before any mutation proceeds,
   * so an attacker supplying a valid ID from a different tenant gets
   * a 404, not a cross-tenant write.
   */
  protected async assertBelongsToTenant(id: string, tenantId: string): Promise<T> {
    const record = await this.rawFindOne(TenantQueryHelper.scopeWhere({ id }, tenantId));
    return this.assertFound(record, id);
  }
}
