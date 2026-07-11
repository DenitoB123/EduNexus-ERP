import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { PaginationUtils } from '../../api/pagination/pagination.utils';
import { PaginatedResult } from '../../database/interfaces/base-model.interface';

function isPaginatedResult(value: unknown): value is PaginatedResult<unknown> {
  return (
    !!value &&
    typeof value === 'object' &&
    'items' in value &&
    'meta' in value &&
    Array.isArray((value as PaginatedResult<unknown>).items)
  );
}

@Injectable()
export class PaginationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data: unknown) => {
        if (!isPaginatedResult(data)) return data;

        const links = PaginationUtils.buildLinks(
          request.originalUrl.split('?')[0],
          data.meta.page,
          data.meta.totalPages,
        );

        return { ...data, links };
      }),
    );
  }
}
