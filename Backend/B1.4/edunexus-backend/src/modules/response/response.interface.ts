export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
  statusCode?: number;
  timestamp?: string;
  path?: string;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  message: string;
  meta: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
