/**
 * response-mapping.interceptor.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * Wraps every successful controller response in the standard
 * `{ success, data, message, timestamp }` envelope, so business modules
 * don't need to manually construct ServiceResponse/ApiSuccessResponseDto
 * on every handler. If a handler already returns a PaginatedResponse,
 * BulkOperationResponse, or ServiceResponse (from B2.3), this interceptor
 * detects that and passes it through unchanged rather than double-wrapping.
 */

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ServiceResponse, PaginatedResponse, BulkOperationResponse } from '../responses/service-response';

function isAlreadyEnveloped(value: unknown): boolean {
  return (
    value instanceof ServiceResponse ||
    value instanceof PaginatedResponse ||
    value instanceof BulkOperationResponse ||
    (typeof value === 'object' && value !== null && 'success' in value && 'timestamp' in value)
  );
}

@Injectable()
export class ResponseMappingInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data === undefined) {
          return { success: true, data: undefined, timestamp: new Date() };
        }
        if (isAlreadyEnveloped(data)) {
          return data;
        }
        return { success: true, data, timestamp: new Date() };
      }),
    );
  }
}
