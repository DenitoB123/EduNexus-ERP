import { PaginatedQuery } from './paginated.query';
import { PaginationInput, SearchInput, SortInput } from '../../../database/interfaces/base-model.interface';

/** Adds the existing `SearchInput` shape (query + fields) on top of pagination/sorting. */
export abstract class SearchQuery extends PaginatedQuery {
  protected constructor(
    tenantId: string,
    public readonly search?: SearchInput,
    pagination?: PaginationInput,
    sort?: SortInput[],
    schoolGroupId?: string,
    schoolId?: string,
    campusId?: string,
  ) {
    super(tenantId, pagination, sort, schoolGroupId, schoolId, campusId);
  }
}
