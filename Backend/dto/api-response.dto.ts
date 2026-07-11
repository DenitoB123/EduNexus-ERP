import { Expose } from 'class-transformer';

export class ApiResponseDTO<T> {
  @Expose()
  success!: boolean;

  @Expose()
  statusCode!: number;

  @Expose()
  path!: string;

  @Expose()
  timestamp!: string;

  @Expose()
  data!: T;
}

export class ErrorResponseDTO {
  @Expose()
  success!: false;

  @Expose()
  statusCode!: number;

  @Expose()
  path!: string;

  @Expose()
  timestamp!: string;

  @Expose()
  message!: string;

  @Expose()
  error!: string;

  @Expose()
  details?: unknown;
}

export class PaginationMetaDTO {
  @Expose()
  page!: number;

  @Expose()
  pageSize!: number;

  @Expose()
  totalItems!: number;

  @Expose()
  totalPages!: number;

  @Expose()
  hasNextPage!: boolean;

  @Expose()
  hasPreviousPage!: boolean;
}
