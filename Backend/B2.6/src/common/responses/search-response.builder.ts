/**
 * search-response.builder.ts
 *
 * Extends the existing pagination envelope (`PaginationResponseBuilder`)
 * with search-specific metadata (query echoed back, applied filters,
 * result count) without changing the underlying `PaginatedResult<T>`
 * shape everything else in the project already expects.
 */

import { ApiResponse } from '../interfaces/api-response.interface';
import { PaginatedResult } from '../../database/interfaces/base-model.interface';
import { SuccessResponseBuilder } from './success-response.builder';

export interface ISearchResult<T> extends PaginatedResult<T> {
  query: string;
  filtersApplied: Record<string, unknown>;
}

export class SearchResponseBuilder {
  static build<T>(
    result: PaginatedResult<T>,
    query: string,
    filtersApplied: Record<string, unknown>,
    path: string,
  ): ApiResponse<ISearchResult<T>> {
    return SuccessResponseBuilder.build({ ...result, query, filtersApplied }, path);
  }
}
