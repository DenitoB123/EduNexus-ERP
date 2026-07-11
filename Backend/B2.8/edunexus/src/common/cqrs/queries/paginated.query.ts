import { TenantQuery } from './tenant.query';
import { PaginationInput, SortInput } from '../../../database/interfaces/base-model.interface';

/**
 * Reuses the existing `PaginationInput`/`SortInput` shapes
 * (database/interfaces/base-model.interface.ts, B1.2) so a query's
 * pagination/sort fields are structurally identical to what
 * `PaginationHelper`/`QueryBuilder` already expect — a handler can
 * pass `query.pagination`/`query.sort` straight through to a
 * repository built on B2.2's `TenantRepository` without translation.
 */
export abstract class PaginatedQuery extends TenantQuery {
  protected constructor(
    tenantId: string,
    public readonly pagination?: PaginationInput,
    public readonly sort?: SortInput[],
    schoolGroupId?: string,
    schoolId?: string,
    campusId?: string,
  ) {
    super(tenantId, schoolGroupId, schoolId, campusId);
  }
}
