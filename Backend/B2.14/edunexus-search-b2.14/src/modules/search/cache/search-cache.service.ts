/**
 * search-cache.service.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 *
 * Optional result caching in front of ISearchEngine.search(), keyed by a
 * hash of the normalized query + tenant/actor context. Backed by an
 * injected ICacheClient (extension point — typically Redis; see
 * interfaces/infrastructure.interfaces.ts). Entirely optional: when no
 * cache client is provided, every method is a safe no-op, so the module
 * works standalone without Redis.
 */

import { Inject, Injectable, Optional } from '@nestjs/common';
import { createHash } from 'crypto';
import { CACHE_CLIENT } from '../constants/tokens';
import { ICacheClient } from '../interfaces/infrastructure.interfaces';
import { ISearchQuery, ISearchResult } from '../interfaces/search-query.interface';
import { ISearchRequestContext } from '../interfaces/infrastructure.interfaces';
import { DEFAULT_SEARCH_CACHE_TTL_SECONDS } from '../constants/search.constants';

@Injectable()
export class SearchCacheService {
  constructor(@Optional() @Inject(CACHE_CLIENT) private readonly cacheClient?: ICacheClient) {}

  get enabled(): boolean {
    return !!this.cacheClient;
  }

  buildKey(query: ISearchQuery, context: ISearchRequestContext): string {
    const payload = JSON.stringify({
      term: query.term,
      mode: query.mode,
      filters: query.filters,
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize,
      tenantId: context.tenant.tenantId,
      campusId: context.tenant.campusId,
      departmentId: context.tenant.departmentId,
    });
    const hash = createHash('sha256').update(payload).digest('hex');
    return `search:results:${hash}`;
  }

  async get(key: string): Promise<ISearchResult | null> {
    if (!this.cacheClient) return null;
    const raw = await this.cacheClient.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ISearchResult;
    } catch {
      return null;
    }
  }

  async set(key: string, result: ISearchResult, ttlSeconds: number = DEFAULT_SEARCH_CACHE_TTL_SECONDS): Promise<void> {
    if (!this.cacheClient) return;
    await this.cacheClient.set(key, JSON.stringify(result), ttlSeconds);
  }

  async invalidateAll(): Promise<void> {
    // A generic ICacheClient doesn't expose pattern-based deletion; hosts
    // using Redis can provide a richer client and override this behavior,
    // or simply rely on the TTL-based expiry above for eventual
    // consistency after index updates.
    return;
  }
}
