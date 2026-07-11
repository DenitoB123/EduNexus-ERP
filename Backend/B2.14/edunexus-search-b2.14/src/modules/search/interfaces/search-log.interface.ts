/**
 * search-log.interface.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 *
 * Persistence contract for recorded search queries, powering "recent
 * searches" and "popular searches" suggestions. A default in-memory
 * implementation is provided (cache/search-cache.service.ts area is for
 * result caching; this is query-history specific) for standalone
 * operation; production deployments should supply a persistent
 * implementation (Prisma-backed table, or Redis-backed) via the
 * SEARCH_LOG_STORE token during B2.21 consolidation.
 */

import { ISearchRequestContext } from './infrastructure.interfaces';

export interface ISearchLogEntry {
  term: string;
  tenantId: string;
  userId: string;
  resultCount: number;
  searchedAt: Date;
}

export interface ISearchLogStore {
  record(entry: ISearchLogEntry): Promise<void> | void;
  getRecent(context: ISearchRequestContext, limit: number): Promise<string[]> | string[];
  getPopular(context: ISearchRequestContext, limit: number): Promise<{ term: string; count: number }[]> | { term: string; count: number }[];
}
