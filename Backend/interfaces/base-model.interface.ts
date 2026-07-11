export interface BaseModel {
  id: string;
  tenantId: string;
  schoolGroupId?: string | null;
  schoolId?: string | null;
  campusId?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  deletedBy?: string | null;
}

export type SortOrder = 'asc' | 'desc';

export interface SortInput {
  field: string;
  order: SortOrder;
}

export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export interface CursorPaginationInput {
  cursor?: string;
  take?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CursorPaginationMeta {
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface CursorPaginatedResult<T> {
  items: T[];
  meta: CursorPaginationMeta;
}

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'isNull'
  | 'isNotNull';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value?: unknown;
}

export interface SearchInput {
  query: string;
  fields: string[];
}

export interface QueryOptions {
  pagination?: PaginationInput;
  sort?: SortInput[];
  filters?: FilterCondition[];
  search?: SearchInput;
  includeDeleted?: boolean;
}
