import { QueryOptions } from '../interfaces/base-model.interface';
import { PaginationHelper } from './pagination.helper';
import { SortHelper } from './sort.helper';
import { FilterHelper } from './filter.helper';
import { SearchHelper } from './search.helper';
import { TenantQueryHelper } from './tenant-query.helper';

export interface BuiltQuery {
  where: Record<string, unknown>;
  orderBy: Record<string, 'asc' | 'desc'>[];
  skip: number;
  take: number;
  page: number;
  pageSize: number;
}

export class QueryBuilder {
  static build(options: QueryOptions, tenantId: string, allowedFields?: string[]): BuiltQuery {
    const { skip, take, page, pageSize } = PaginationHelper.normalize(options.pagination);
    const orderBy = SortHelper.buildOrderBy(options.sort, allowedFields);

    let where: Record<string, unknown> = {
      ...FilterHelper.buildWhere(options.filters, allowedFields),
      ...SearchHelper.buildWhere(options.search, allowedFields),
    };

    where = TenantQueryHelper.scopeWhere(where, tenantId);
    where = TenantQueryHelper.excludeSoftDeleted(where, options.includeDeleted);

    return { where, orderBy, skip, take, page, pageSize };
  }
}
