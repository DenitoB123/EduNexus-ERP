import { PaginatedResult, PaginationInput } from '../../database/interfaces/base-model.interface';
import { PaginationHelper } from '../../database/helpers/pagination.helper';
import { TenantQueryHelper } from '../../database/helpers/tenant-query.helper';
import { ISpecification } from '../base/specification';

export interface SpecificationDelegate<T> {
  findMany(args: { where: Record<string, unknown>; skip?: number; take?: number }): Promise<T[]>;
  count(args: { where: Record<string, unknown> }): Promise<number>;
}

export class SpecificationQueryHelper {
  static scopedWhere<T>(spec: ISpecification<T>, tenantId: string): Record<string, unknown> {
    let where = spec.toQuery();
    where = TenantQueryHelper.scopeWhere(where, tenantId);
    where = TenantQueryHelper.excludeSoftDeleted(where);
    return where;
  }

  static async findMany<T>(
    delegate: SpecificationDelegate<T>,
    spec: ISpecification<T>,
    tenantId: string,
    pagination?: PaginationInput,
  ): Promise<PaginatedResult<T>> {
    const { skip, take, page, pageSize } = PaginationHelper.normalize(pagination);
    const where = this.scopedWhere(spec, tenantId);

    const [items, totalItems] = await Promise.all([
      delegate.findMany({ where, skip, take }),
      delegate.count({ where }),
    ]);

    return PaginationHelper.buildResult(items, totalItems, page, pageSize);
  }

  static async count<T>(
    delegate: Pick<SpecificationDelegate<T>, 'count'>,
    spec: ISpecification<T>,
    tenantId: string,
  ): Promise<number> {
    const where = this.scopedWhere(spec, tenantId);
    return delegate.count({ where });
  }
}
