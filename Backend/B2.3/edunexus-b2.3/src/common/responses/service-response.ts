/**
 * service-response.ts
 *
 * B2.3 — Generic Service Layer
 *
 * Standard envelope every generic/business service can use to return
 * results to controllers. Not mandatory for every method (many methods
 * return raw entities, per ICrudService), but available whenever a module
 * wants a uniform success/failure/validation shape.
 */

export interface IValidationError {
  field: string;
  message: string;
  code?: string;
}

export class ServiceResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly message?: string;
  readonly errors?: IValidationError[];
  readonly meta?: Record<string, unknown>;
  readonly timestamp: Date;

  private constructor(params: {
    success: boolean;
    data?: T;
    message?: string;
    errors?: IValidationError[];
    meta?: Record<string, unknown>;
  }) {
    this.success = params.success;
    this.data = params.data;
    this.message = params.message;
    this.errors = params.errors;
    this.meta = params.meta;
    this.timestamp = new Date();
  }

  static ok<T>(data: T, message?: string, meta?: Record<string, unknown>): ServiceResponse<T> {
    return new ServiceResponse<T>({ success: true, data, message, meta });
  }

  static fail<T = never>(message: string, errors?: IValidationError[], meta?: Record<string, unknown>): ServiceResponse<T> {
    return new ServiceResponse<T>({ success: false, message, errors, meta });
  }

  static validationFailed<T = never>(errors: IValidationError[], message = 'Validation failed'): ServiceResponse<T> {
    return new ServiceResponse<T>({ success: false, message, errors });
  }
}

export interface IPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class PaginatedResponse<T> {
  readonly success = true;
  readonly data: T[];
  readonly pagination: IPaginationMeta;
  readonly timestamp: Date;

  constructor(items: T[], page: number, pageSize: number, total: number) {
    this.data = items;
    const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
    this.pagination = {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
    this.timestamp = new Date();
  }
}

export interface IBulkOperationError {
  index: number;
  identifier?: unknown;
  message: string;
}

export class BulkOperationResponse<T> {
  readonly success: boolean;
  readonly processedCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly results: T[];
  readonly errors: IBulkOperationError[];
  readonly timestamp: Date;

  constructor(results: T[], errors: IBulkOperationError[] = [], processedCount?: number) {
    this.results = results;
    this.errors = errors;
    this.successCount = results.length;
    this.failureCount = errors.length;
    this.processedCount = processedCount ?? results.length + errors.length;
    this.success = errors.length === 0;
    this.timestamp = new Date();
  }
}
