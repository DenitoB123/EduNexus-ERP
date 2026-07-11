/**
 * search-query.interface.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 */

export type SearchMode = 'keyword' | 'phrase' | 'exact' | 'partial';

export type SortField = 'relevance' | 'alphabetical' | 'createdAt' | 'updatedAt' | string;
export type SortDirection = 'asc' | 'desc';

export interface ISearchSort {
  field: SortField;
  direction: SortDirection;
}

export interface IDateRangeFilter {
  from?: string | Date;
  to?: string | Date;
}

export interface ISearchFilters {
  tenantId?: string;
  campusId?: string;
  departmentId?: string;
  module?: string | string[];
  status?: string | string[];
  entityType?: string | string[];
  dateRange?: { field: 'createdAt' | 'updatedAt'; range: IDateRangeFilter };
  /** Arbitrary user-defined filters merged into the engine's where-clause (field -> value or operator object). */
  custom?: Record<string, unknown>;
}

export interface ISearchQuery {
  term: string;
  mode: SearchMode;
  filters: ISearchFilters;
  sort: ISearchSort[];
  page: number;
  pageSize: number;
}

export interface ISearchResultItem<TMetadata = Record<string, unknown>> {
  id: string;
  entityType: string;
  entityId: string;
  module: string;
  title: string;
  subtitle?: string;
  score: number;
  highlightedText?: string;
  metadata: TMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISearchResult<TMetadata = Record<string, unknown>> {
  items: ISearchResultItem<TMetadata>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  tookMs: number;
  query: Pick<ISearchQuery, 'term' | 'mode'>;
}

export interface ISuggestion {
  text: string;
  entityType?: string;
  score?: number;
}
