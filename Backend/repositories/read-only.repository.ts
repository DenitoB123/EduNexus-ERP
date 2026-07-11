import { PaginatedResult, PaginationInput, QueryOptions } from '../../database/interfaces/base-model.interface';
import { PaginationHelper } from '../../database/helpers/pagination.helper';
import { SortHelper } from '../../database/helpers/sort.helper';
import { FilterHelper } from '../../database/helpers/filter.helper';
import { SearchHelper } from '../../database/helpers/search.helper';
import { TenantQueryHelper } from '../../database/helpers/tenant-query.helper';
import { IReadRepository } from './interfaces/read-repository.interface';
import { ISpecificationRepository } from './interfaces/specification-repository.interface';
import { ISpecification } from '../base/specification';
import { SpecificationQueryHelper } from './specification-query.helper';
import { PrismaReadDelegate } from './interfaces/prisma-read-delegate.interface';

/**
 * A repository with no write surface whatsoever — `PrismaReadDelegate`
 * has no create/update/delete methods, so it is impossible for a
 * subclass to accidentally mutate data through this class, not merely
 * discouraged by convention. Intended for reporting/analytics
 * read-models or any repository that should only ever query.
 */
export abstract class ReadOnlyRepository<T extends { id: string }>
  implements IReadRepository<T>, ISpecificationRepository<T>
{
  protected abstract readonly modelName: string;
  protected abstract readonly allowedFilterFields: string[];
  protected abstract readonly allowedSearchFields: string[];

  constructor(protected readonly delegate: PrismaReadDelegate<T>) {}

  private buildWhere(options: QueryOptions): Record<string, unknown> {
    return {
      ...FilterHelper.buildWhere(options.filters, this.allowedFilterFields),
      ...SearchHelper.buildWhere(options.search, this.allowedSearchFields),
    };
  }

  async findById(id: string, tenantId: string): Promise<T | null> {
    return this.delegate.findFirst({ where: TenantQueryHelper.scopeWhere({ id }, tenantId) });
  }

  async findOne(options: QueryOptions, tenantId: string): Promise<T | null> {
    const where = TenantQueryHelper.excludeSoftDeleted(
      TenantQueryHelper.scopeWhere(this.buildWhere(options), tenantId),
      options.includeDeleted,
    );
    return this.delegate.findFirst({ where });
  }

  async findMany(options: QueryOptions, tenantId: string): Promise<PaginatedResult<T>> {
    const { skip, take, page, pageSize } = PaginationHelper.normalize(options.pagination);
    const where = TenantQueryHelper.excludeSoftDeleted(
      TenantQueryHelper.scopeWhere(this.buildWhere(options), tenantId),
      options.includeDeleted,
    );
    const orderBy = SortHelper.buildOrderBy(options.sort, this.allowedFilterFields);

    const [items, totalItems] = await Promise.all([
      this.delegate.findMany({ where, orderBy, skip, take }),
      this.delegate.count({ where }),
    ]);

    return PaginationHelper.buildResult(items, totalItems, page, pageSize);
  }

  async exists(id: string, tenantId: string): Promise<boolean> {
    const record = await this.delegate.findFirst({ where: TenantQueryHelper.scopeWhere({ id }, tenantId) });
    return record !== null;
  }

  async count(options: QueryOptions, tenantId: string): Promise<number> {
    const where = TenantQueryHelper.excludeSoftDeleted(TenantQueryHelper.scopeWhere(this.buildWhere(options), tenantId));
    return this.delegate.count({ where });
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
}
