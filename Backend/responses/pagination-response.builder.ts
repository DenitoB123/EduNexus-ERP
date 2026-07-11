import { ApiResponse } from '../interfaces/api-response.interface';
import { PaginatedResult } from '../../database/interfaces/base-model.interface';
import { SuccessResponseBuilder } from './success-response.builder';

export class PaginationResponseBuilder {
  static build<T>(result: PaginatedResult<T>, path: string): ApiResponse<PaginatedResult<T>> {
    return SuccessResponseBuilder.build(result, path);
  }
}
