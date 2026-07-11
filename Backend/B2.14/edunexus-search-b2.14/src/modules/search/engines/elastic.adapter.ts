/**
 * elastic.adapter.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 *
 * Alternate ISearchEngine implementation targeting Elasticsearch or
 * OpenSearch (both speak the same wire protocol this adapter uses). Not
 * wired as the default provider (search.module.ts defaults to
 * PrismaSearchEngine, which needs no extra infrastructure) — activate it
 * by:
 *
 *   1. Installing a client (`@elastic/elasticsearch` or
 *      `@opensearch-project/opensearch`) in the host application.
 *   2. Providing a value satisfying IElasticClientLike (below) under the
 *      ELASTIC_CLIENT token — a thin interface rather than importing the
 *      real client type directly, so this module has no hard dependency on
 *      either package and stays installable/typecheckable without them.
 *   3. Overriding the SEARCH_ENGINE provider in search.module.ts to
 *      `{ provide: SEARCH_ENGINE, useClass: ElasticSearchAdapter }`.
 *
 * No business module changes are required for this swap — every consumer
 * depends on ISearchEngine, never on a concrete engine class.
 */

import { Inject, Injectable, Optional } from '@nestjs/common';
import { ISearchEngine } from './search-engine.interface';
import { ISearchDocument } from '../interfaces/search-document.interface';
import { ISearchQuery, ISearchResult, ISuggestion } from '../interfaces/search-query.interface';
import { ISearchRequestContext, IAppLogger } from '../interfaces/infrastructure.interfaces';
import { APP_LOGGER } from '../constants/tokens';
import { DEFAULT_SUGGESTION_LIMIT } from '../constants/search.constants';

export const ELASTIC_CLIENT = Symbol('SEARCH_ELASTIC_CLIENT');
export const ELASTIC_INDEX_NAME = 'edunexus_search_index';

/**
 * Minimal shape this adapter needs from an Elasticsearch/OpenSearch client.
 * Deliberately mirrors the official clients' `index`/`bulk`/`delete`/
 * `search`/`count` method signatures closely enough that a thin wrapper
 * around the real client satisfies this interface with no translation
 * layer.
 */
export interface IElasticClientLike {
  index(params: { index: string; id: string; document: Record<string, unknown> }): Promise<unknown>;
  bulk(params: { operations: unknown[] }): Promise<{ items: Array<Record<string, { error?: { reason: string } }>> }>;
  delete(params: { index: string; id: string }): Promise<unknown>;
  deleteByQuery(params: { index: string; query: Record<string, unknown> }): Promise<{ deleted?: number }>;
  search<T = Record<string, unknown>>(params: {
    index: string;
    query: Record<string, unknown>;
    sort?: unknown[];
    from?: number;
    size?: number;
  }): Promise<{ hits: { hits: Array<{ _id: string; _score: number | null; _source: T }>; total: { value: number } } }>;
  count(params: { index: string; query?: Record<string, unknown> }): Promise<{ count: number }>;
}

@Injectable()
export class ElasticSearchAdapter implements ISearchEngine {
  readonly name = 'elasticsearch';

  constructor(
    @Inject(ELASTIC_CLIENT) private readonly client: IElasticClientLike,
    @Optional() @Inject(APP_LOGGER) private readonly logger?: IAppLogger,
  ) {}

  async index(document: ISearchDocument): Promise<void> {
    await this.client.index({ index: ELASTIC_INDEX_NAME, id: document.id, document: { ...document } });
  }

  async bulkIndex(
    documents: ISearchDocument[],
  ): Promise<{ indexed: number; failed: number; errors: { entityId: string; message: string }[] }> {
    if (documents.length === 0) return { indexed: 0, failed: 0, errors: [] };

    const operations = documents.flatMap((doc) => [
      { index: { _index: ELASTIC_INDEX_NAME, _id: doc.id } },
      { ...doc },
    ]);

    const result = await this.client.bulk({ operations });
    const errors: { entityId: string; message: string }[] = [];
    result.items.forEach((item, i) => {
      const op = item.index ?? item['index' as keyof typeof item];
      if (op?.error) {
        errors.push({ entityId: documents[Math.floor(i / 2)]?.entityId ?? 'unknown', message: op.error.reason });
      }
    });

    return { indexed: documents.length - errors.length, failed: errors.length, errors };
  }

  async remove(entityType: string, entityId: string, _tenantId: string): Promise<void> {
    await this.client.delete({ index: ELASTIC_INDEX_NAME, id: `${entityType}:${entityId}` });
  }

  async removeMany(entityType: string, tenantId: string): Promise<{ removed: number }> {
    const result = await this.client.deleteByQuery({
      index: ELASTIC_INDEX_NAME,
      query: { bool: { filter: [{ term: { entityType } }, { term: { tenantId } }] } },
    });
    return { removed: result.deleted ?? 0 };
  }

  async search(
    query: ISearchQuery,
    context: ISearchRequestContext,
    visibilityFilter?: Record<string, unknown>,
  ): Promise<ISearchResult> {
    const start = Date.now();
    const esQuery = this.buildEsQuery(query, context, visibilityFilter);

    const response = await this.client.search<ISearchDocument>({
      index: ELASTIC_INDEX_NAME,
      query: esQuery,
      sort: this.buildEsSort(query),
      from: (query.page - 1) * query.pageSize,
      size: query.pageSize,
    });

    this.logger?.debug('Elasticsearch query executed', 'ElasticSearchAdapter', { tookMs: Date.now() - start });

    return {
      items: response.hits.hits.map((hit) => ({
        id: hit._id,
        entityType: hit._source.entityType,
        entityId: hit._source.entityId,
        module: hit._source.module,
        title: hit._source.title,
        subtitle: hit._source.subtitle,
        score: hit._score ?? 0,
        metadata: hit._source.metadata,
        createdAt: hit._source.createdAt,
        updatedAt: hit._source.updatedAt,
      })),
      total: response.hits.total.value,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: query.pageSize > 0 ? Math.ceil(response.hits.total.value / query.pageSize) : 0,
      tookMs: Date.now() - start,
      query: { term: query.term, mode: query.mode },
    };
  }

  async suggest(prefix: string, context: ISearchRequestContext, entityType?: string, limit = DEFAULT_SUGGESTION_LIMIT): Promise<ISuggestion[]> {
    const response = await this.client.search<ISearchDocument>({
      index: ELASTIC_INDEX_NAME,
      query: {
        bool: {
          must: [{ match_phrase_prefix: { title: prefix } }],
          filter: [{ term: { tenantId: context.tenant.tenantId } }, ...(entityType ? [{ term: { entityType } }] : [])],
        },
      },
      size: limit,
    });
    return response.hits.hits.map((hit) => ({ text: hit._source.title, entityType: hit._source.entityType, score: hit._score ?? undefined }));
  }

  async count(tenantId: string, entityType?: string): Promise<number> {
    const response = await this.client.count({
      index: ELASTIC_INDEX_NAME,
      query: { bool: { filter: [{ term: { tenantId } }, ...(entityType ? [{ term: { entityType } }] : [])] } },
    });
    return response.count;
  }

  private buildEsQuery(
    query: ISearchQuery,
    context: ISearchRequestContext,
    visibilityFilter?: Record<string, unknown>,
  ): Record<string, unknown> {
    const filter: Record<string, unknown>[] = [
      { term: { tenantId: query.filters.tenantId ?? context.tenant.tenantId } },
    ];
    if (query.filters.campusId) filter.push({ term: { campusId: query.filters.campusId } });
    if (query.filters.departmentId) filter.push({ term: { departmentId: query.filters.departmentId } });
    if (query.filters.module) filter.push({ terms: { module: [].concat(query.filters.module as never) } });
    if (query.filters.status) filter.push({ terms: { status: [].concat(query.filters.status as never) } });
    if (query.filters.entityType) filter.push({ terms: { entityType: [].concat(query.filters.entityType as never) } });
    if (visibilityFilter) filter.push({ term: visibilityFilter });

    if (!query.term) {
      return { bool: { filter } };
    }

    const must =
      query.mode === 'exact'
        ? [{ term: { 'title.keyword': query.term } }]
        : query.mode === 'phrase'
          ? [{ multi_match: { query: query.term, type: 'phrase', fields: ['title^3', 'subtitle^2', 'searchableText'] } }]
          : [{ multi_match: { query: query.term, type: query.mode === 'partial' ? 'phrase_prefix' : 'best_fields', fields: ['title^3', 'subtitle^2', 'keywords^2', 'searchableText'] } }];

    return { bool: { must, filter } };
  }

  private buildEsSort(query: ISearchQuery): unknown[] {
    if (query.sort.length === 0) return ['_score'];
    return query.sort.map((s) => {
      if (s.field === 'relevance') return '_score';
      if (s.field === 'alphabetical') return { 'title.keyword': s.direction };
      return { [s.field]: s.direction };
    });
  }
}
