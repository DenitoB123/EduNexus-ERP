/**
 * search-engine.interface.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 *
 * The single abstraction every concrete search backend implements. All of
 * SearchService/IndexingService/RankingService talk to `ISearchEngine`
 * only — never to Prisma or Elasticsearch directly — so swapping the
 * backend (Prisma full-text -> Elasticsearch/OpenSearch/Meilisearch) is a
 * one-line provider change (see search.module.ts) with zero changes to any
 * business module.
 */

import { ISearchDocument } from '../interfaces/search-document.interface';
import { ISearchQuery, ISearchResult, ISuggestion } from '../interfaces/search-query.interface';
import { ISearchRequestContext } from '../interfaces/infrastructure.interfaces';

export interface ISearchEngine {
  /** Engine identifier, e.g. "prisma", "elasticsearch", "opensearch", "meilisearch". Used in logs/metrics. */
  readonly name: string;

  index(document: ISearchDocument): Promise<void>;
  bulkIndex(documents: ISearchDocument[]): Promise<{ indexed: number; failed: number; errors: { entityId: string; message: string }[] }>;
  remove(entityType: string, entityId: string, tenantId: string): Promise<void>;
  removeMany(entityType: string, tenantId: string): Promise<{ removed: number }>;

  search(query: ISearchQuery, context: ISearchRequestContext, visibilityFilter?: Record<string, unknown>): Promise<ISearchResult>;

  suggest(prefix: string, context: ISearchRequestContext, entityType?: string, limit?: number): Promise<ISuggestion[]>;

  /** Total indexed document count, optionally scoped to an entity type/tenant. Used for admin/monitoring endpoints. */
  count(tenantId: string, entityType?: string): Promise<number>;
}
