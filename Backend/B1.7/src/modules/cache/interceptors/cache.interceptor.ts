import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';
import {
  CACHE_EVICT_METADATA,
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
} from '../cache.constants';

/**
 * Method-level cache-aside / cache-evict interceptor driven by the
 * @Cacheable / @CacheEvict decorators. Registered per-controller or
 * per-route with @UseInterceptors(CacheInterceptor) — intentionally NOT
 * global, since most endpoints shouldn't be cached by default.
 *
 * Placeholder resolution: '{paramName}' is replaced using the route params
 * object (req.params) — this is HTTP-context only by design; for caching
 * inside plain service-to-service calls, call CacheService directly instead.
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();
    const cacheKeyTemplate = this.reflector.get<string>(CACHE_KEY_METADATA, handler);
    const evictKeyTemplate = this.reflector.get<string>(CACHE_EVICT_METADATA, handler);
    const ttl = this.reflector.get<number | undefined>(CACHE_TTL_METADATA, handler);

    const request = context.switchToHttp().getRequest();
    const params = { ...request?.params, ...request?.query };

    if (cacheKeyTemplate) {
      const resolvedKey = this.resolveTemplate(cacheKeyTemplate, params);
      return from(this.cacheService.get(resolvedKey)).pipe(
        switchMap((cached) => {
          if (cached !== null) return of(cached);
          return next.handle().pipe(
            tap((result) => {
              void this.cacheService.set(resolvedKey, result, { ttl });
            }),
          );
        }),
      );
    }

    if (evictKeyTemplate) {
      const resolvedPattern = this.resolveTemplate(evictKeyTemplate, params);
      return next.handle().pipe(
        tap(() => {
          if (resolvedPattern.endsWith('*')) {
            void this.cacheService.invalidatePattern(resolvedPattern);
          } else {
            void this.cacheService.del(resolvedPattern);
          }
        }),
      );
    }

    return next.handle();
  }

  private resolveTemplate(template: string, params: Record<string, unknown>): string {
    return template.replace(/\{(\w+)\}/g, (_match, paramName) =>
      params[paramName] !== undefined ? String(params[paramName]) : `{${paramName}}`,
    );
  }
}
