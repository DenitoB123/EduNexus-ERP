import { Injectable } from '@nestjs/common';
import { IQuery, IQueryHandler } from '../interfaces/query.interface';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import {
  CQRS_DEFAULT_QUERY_CACHE_TTL_SECONDS,
  CQRS_QUERY_CACHE_PREFIX,
} from '../constants/cqrs.constants';

/**
 * Uses the existing `CacheService.wrap()` (infrastructure/cache,
 * B1.x) — no separate caching mechanism is introduced. A handler
 * opts in by implementing `IQueryHandler.getCacheKey()`; handlers
 * that don't implement it (return `null`/`undefined`) are never
 * cached, the safe default for queries whose freshness matters more
 * than their cost.
 *
 * Deliberately NOT an `IQueryPipelineBehavior` like the other query
 * behaviors: caching needs the *resolved handler* (for
 * `getCacheKey`/`getCacheTtlSeconds`), which the generic
 * `query.constructor`-keyed pipeline chain doesn't have access to.
 * `QueryBus` calls this directly as the innermost step, wrapping the
 * handler's own `execute()` — see `buses/query-bus.service.ts`.
 */
@Injectable()
export class QueryCachingBehavior {
  constructor(private readonly cacheService: CacheService) {}

  async wrapExecute<TQuery extends IQuery, TResult>(
    query: TQuery,
    context: ICqrsExecutionContext,
    handler: IQueryHandler<TQuery, TResult>,
  ): Promise<TResult> {
    const cacheKey = handler.getCacheKey?.(query, context);

    if (!cacheKey) {
      return handler.execute(query, context);
    }

    const namespacedKey = `${CQRS_QUERY_CACHE_PREFIX}:${context.tenantId ?? 'global'}:${cacheKey}`;
    const ttl = handler.getCacheTtlSeconds?.() ?? CQRS_DEFAULT_QUERY_CACHE_TTL_SECONDS;

    return this.cacheService.wrap(namespacedKey, () => handler.execute(query, context), ttl);
  }
}
