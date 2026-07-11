import { ApiErrorResponse, ApiResponse } from '../interfaces/api-response.interface';
import { PaginatedResult } from '../../database/interfaces/base-model.interface';
import { SuccessResponseBuilder } from './success-response.builder';
import { ErrorResponseBuilder } from './error-response.builder';
import { PaginationResponseBuilder } from './pagination-response.builder';
import { ErrorCode } from '../constants/error-codes.constants';

export class StandardResponseFormatter {
  static success<T>(data: T, path: string, statusCode = 200): ApiResponse<T> {
    return SuccessResponseBuilder.build(data, path, statusCode);
  }

  static paginated<T>(result: PaginatedResult<T>, path: string): ApiResponse<PaginatedResult<T>> {
    return PaginationResponseBuilder.build(result, path);
  }

  static error(
    path: string,
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
  ): ApiErrorResponse {
    return ErrorResponseBuilder.fromCode(path, statusCode, code, message, details);
  }
}
