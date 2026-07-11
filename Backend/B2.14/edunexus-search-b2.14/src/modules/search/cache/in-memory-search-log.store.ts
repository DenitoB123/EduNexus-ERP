/**
 * in-memory-search-log.store.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 *
 * Default ISearchLogStore implementation: process-local, bounded, in-memory
 * history — enough for a single-instance deployment or local development.
 * Production/multi-instance deployments should provide a persistent
 * implementation (Prisma-backed table, or Redis-backed sorted sets) under
 * the SEARCH_LOG_STORE token during B2.21 consolidation; SearchService and
 * IndexingService only depend on ISearchLogStore, so swapping this out
 * requires no changes elsewhere.
 */

import { Injectable } from '@nestjs/common';
import { ISearchLogEntry, ISearchLogStore } from '../interfaces/search-log.interface';
import { ISearchRequestContext } from '../interfaces/infrastructure.interfaces';

const MAX_ENTRIES_PER_TENANT = 5000;
const MAX_RECENT_PER_USER = 50;

@Injectable()
export class InMemorySearchLogStore implements ISearchLogStore {
  private readonly entriesByTenant = new Map<string, ISearchLogEntry[]>();

  record(entry: ISearchLogEntry): void {
    const list = this.entriesByTenant.get(entry.tenantId) ?? [];
    list.push(entry);
    if (list.length > MAX_ENTRIES_PER_TENANT) {
      list.splice(0, list.length - MAX_ENTRIES_PER_TENANT);
    }
    this.entriesByTenant.set(entry.tenantId, list);
  }

  getRecent(context: ISearchRequestContext, limit: number): string[] {
    const list = this.entriesByTenant.get(context.tenant.tenantId) ?? [];
    const terms: string[] = [];
    for (let i = list.length - 1; i >= 0 && terms.length < Math.min(limit, MAX_RECENT_PER_USER); i--) {
      if (list[i].userId === context.actor.userId && !terms.includes(list[i].term)) {
        terms.push(list[i].term);
      }
    }
    return terms;
  }

  getPopular(context: ISearchRequestContext, limit: number): { term: string; count: number }[] {
    const list = this.entriesByTenant.get(context.tenant.tenantId) ?? [];
    const counts = new Map<string, number>();
    for (const entry of list) {
      counts.set(entry.term, (counts.get(entry.term) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}
