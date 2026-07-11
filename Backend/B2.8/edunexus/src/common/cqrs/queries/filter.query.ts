import { SearchQuery } from './search.query';
import {
  FilterCondition,
  PaginationInput,
  SearchInput,
  SortInput,
} from '../../../database/interfaces/base-model.interface';

/** Adds the existing `FilterCondition[]` shape used by `FilterHelper`/`QueryBuilder` (B1.2/B2.2). */
export abstract class FilterQuery extends SearchQuery {
  protected constructor(
    tenantId: string,
    public readonly filters?: FilterCondition[],
    search?: SearchInput,
    pagination?: PaginationInput,
    sort?: SortInput[],
    schoolGroupId?: string,
    schoolId?: string,
    campusId?: string,
  ) {
    super(tenantId, search, pagination, sort, schoolGroupId, schoolId, campusId);
  }
}
