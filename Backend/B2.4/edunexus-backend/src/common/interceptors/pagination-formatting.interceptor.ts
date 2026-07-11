/**
 * pagination-formatting.interceptor.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * Business modules' custom list endpoints often return the raw
 * IPaginatedResult<T> / ICursorPaginatedResult<T> shapes produced by the
 * B2.3 Generic Service Layer directly. This interceptor detects those
 * shapes and formats them into the standardized pagination envelope
 * (ApiPaginatedResponseDto / ApiCursorPaginatedResponseDto), matching what
 * PaginatedCrudMixin (../controllers/crud.controller.ts) already returns
 * natively, so the wire format is identical either way.
 */

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { totalPages as computeTotalPages } from '../utils/pagination.util';

interface IRawOffsetPage {
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
}

interface IRawCursorPage {
  items: unknown[];
  nextCursor: Record<string, unknown> | null;
  hasMore: boolean;
}

function isRawOffsetPage(value: unknown): value is IRawOffsetPage {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as IRawOffsetPage).items) &&
    typeof (value as IRawOffsetPage).total === 'number' &&
    typeof (value as IRawOffsetPage).page === 'number' &&
    typeof (value as IRawOffsetPage).pageSize === 'number'
  );
}

function isRawCursorPage(value: unknown): value is IRawCursorPage {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as IRawCursorPage).items) &&
    'hasMore' in (value as IRawCursorPage) &&
    'nextCursor' in (value as IRawCursorPage)
  );
}

@Injectable()
export class PaginationFormattingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (isRawOffsetPage(data)) {
          return {
            success: true,
            data: data.items,
            pagination: {
              page: data.page,
              pageSize: data.pageSize,
              total: data.total,
              totalPages: computeTotalPages(data.total, data.pageSize),
              hasNextPage: data.page < computeTotalPages(data.total, data.pageSize),
              hasPreviousPage: data.page > 1,
            },
            timestamp: new Date(),
          };
        }
        if (isRawCursorPage(data)) {
          return {
            success: true,
            data: data.items,
            nextCursor: data.nextCursor,
            hasMore: data.hasMore,
            timestamp: new Date(),
          };
        }
        return data;
      }),
    );
  }
}
