import { ICqrsExecutionContext } from './cqrs-context.interface';

export interface IQuery {
  readonly queryId: string;
  readonly queryName: string;
  readonly issuedAt: Date;
}

export type QueryType<TQuery extends IQuery = IQuery> = new (...args: any[]) => TQuery;

export interface IQueryHandler<TQuery extends IQuery, TResult = unknown> {
  execute(query: TQuery, context: ICqrsExecutionContext): Promise<TResult>;
  /**
   * Optional cache key builder. When a handler implements this, the
   * QueryCachingBehavior will cache `execute()`'s result under the
   * returned key (namespaced under `CQRS_QUERY_CACHE_PREFIX`) using
   * the existing `CacheService` (infrastructure/cache) — no separate
   * caching mechanism is introduced.
   */
  getCacheKey?(query: TQuery, context: ICqrsExecutionContext): string | null;
  /** Optional override of the default cache TTL, in seconds. */
  getCacheTtlSeconds?(): number;
}

export interface IQueryBus {
  execute<TQuery extends IQuery, TResult = unknown>(
    query: TQuery,
    context: ICqrsExecutionContext,
  ): Promise<TResult>;
  register<TQuery extends IQuery, TResult>(
    queryType: QueryType<TQuery>,
    handler: IQueryHandler<TQuery, TResult>,
  ): void;
}
