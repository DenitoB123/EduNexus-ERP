import { ApiResponse } from '../interfaces/api-response.interface';

export class SuccessResponseBuilder {
  static build<T>(data: T, path: string, statusCode = 200): ApiResponse<T> {
    return {
      success: true,
      statusCode,
      path,
      timestamp: new Date().toISOString(),
      data,
    };
  }
}
