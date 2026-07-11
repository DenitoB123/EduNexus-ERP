import { Injectable, CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { SuccessResponseBuilder } from '../../common/responses/success-response.builder';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

/**
 * Wraps raw controller return values in the standard ApiResponse
 * envelope. This mirrors Phase 1.1's ResponseInterceptor but lives in
 * the API layer for future modules that want the API-specific
 * pipeline (metrics + response shaping) without pulling in the whole
 * global interceptor stack, e.g. for testing a controller in
 * isolation.
 */
@Injectable()
export class ResponseTransformerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data: unknown): ApiResponse<unknown> => {
        if (data && typeof data === 'object' && 'success' in data && 'statusCode' in data) {
          return data as ApiResponse<unknown>;
        }
        return SuccessResponseBuilder.build(data, request.originalUrl);
      }),
    );
  }
}
