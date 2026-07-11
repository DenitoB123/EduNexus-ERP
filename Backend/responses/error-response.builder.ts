import { ApiErrorResponse } from '../interfaces/api-response.interface';
import { ErrorCode } from '../constants/error-codes.constants';

export class ErrorResponseBuilder {
  static build(
    path: string,
    statusCode: number,
    error: string,
    message: string,
    details?: unknown,
  ): ApiErrorResponse {
    return {
      success: false,
      statusCode,
      path,
      timestamp: new Date().toISOString(),
      error,
      message,
      details,
    };
  }

  static fromCode(path: string, statusCode: number, code: ErrorCode, message: string, details?: unknown): ApiErrorResponse {
    return this.build(path, statusCode, code, message, details);
  }
}
