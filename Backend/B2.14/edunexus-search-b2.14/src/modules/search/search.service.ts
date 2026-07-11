/**
 * search.service.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 *
 * The single entry point every business module (and the generated
 * SearchController) calls to execute a search. Orchestrates:
 *   query parsing -> filter building (tenant/RBAC enforced) -> cache lookup
 *   -> engine execution -> cache write -> audit -> event publish -> search log
 */

import { Inject, Injectable, Optional } from '@nestjs/common';
import { SEARCH_ENGINE, AUDIT_SERVICE, EVENT_BUS, SEARCH_LOG_STORE, APP_LOGGER } from './constants/tokens';
import { ISearchEngine } from './engines/search-engine.interface';
import { QueryParserService } from './query/query-parser.service';
import { FilterBuilderService } from './query/filter-builder.service';
import { SearchCacheService } from './cache/search-cache.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SuggestionQueryDto } from './dto/index-document.dto';
import {
  IAuditService,
  IEventBus,
  ISearchRequestContext,
  IAppLogger,
} from './interfaces/infrastructure.interfaces';
import { ISearchLogStore } from './interfaces/search-log.interface';
import { ISearchResult, ISuggestion } from './interfaces/search-query.interface';
import { SEARCH_EXECUTED_EVENT, ISearchExecutedPayload } from './events/search.events';
import { DEFAULT_POPULAR_SEARCHES_LIMIT, DEFAULT_RECENT_SEARCHES_LIMIT } from './constants/search.constants';

@Injectable()
export class SearchService {
  constructor(
    @Inject(SEARCH_ENGINE) private readonly engine: ISearchEngine,
    private readonly queryParser: QueryParserService,
    private readonly filterBuilder: FilterBuilderService,
    private readonly cache: SearchCacheService,
    @Optional() @Inject(AUDIT_SERVICE) private readonly audit?: IAuditService,
    @Optional() @Inject(EVENT_BUS) private readonly eventBus?: IEventBus,
    @Optional() @Inject(SEARCH_LOG_STORE) private readonly searchLog?: ISearchLogStore,
    @Optional() @Inject(APP_LOGGER) private readonly logger?: IAppLogger,
  ) {}

  async search(dto: SearchQueryDto, context: ISearchRequestContext): Promise<ISearchResult> {
    const query = this.queryParser.parse(dto, context);

    const cacheKey = this.cache.buildKey(query, context);
    const cached = this.cache.enabled ? await this.cache.get(cacheKey) : null;
    if (cached) {
      this.logger?.debug('Search cache hit', 'SearchService', { term: query.term });
      return cached;
    }

    const visibilityFilter = await this.filterBuilder.resolveVisibilityFilter(
      context,
      Array.isArray(query.filters.entityType) ? undefined : query.filters.entityType,
    );

    const result = await this.engine.search(query, context, visibilityFilter);

    if (this.cache.enabled) {
      await this.cache.set(cacheKey, result);
    }

    await this.recordExecution(query.term, query.mode, result, context);

    return result;
  }

  async suggest(dto: SuggestionQueryDto, context: ISearchRequestContext): Promise<ISuggestion[]> {
    return this.engine.suggest(dto.prefix, context, dto.entityType);
  }

  async recentSearches(context: ISearchRequestContext, limit = DEFAULT_RECENT_SEARCHES_LIMIT): Promise<string[]> {
    if (!this.searchLog) return [];
    return this.searchLog.getRecent(context, limit);
  }

  async popularSearches(
    context: ISearchRequestContext,
    limit = DEFAULT_POPULAR_SEARCHES_LIMIT,
  ): Promise<{ term: string; count: number }[]> {
    if (!this.searchLog) return [];
    return this.searchLog.getPopular(context, limit);
  }

  async count(context: ISearchRequestContext, entityType?: string): Promise<number> {
    return this.engine.count(context.tenant.tenantId, entityType);
  }

  private async recordExecution(
    term: string,
    mode: string,
    result: ISearchResult,
    context: ISearchRequestContext,
  ): Promise<void> {
    if (!term) return;

    if (this.searchLog) {
      await this.searchLog.record({
        term,
        tenantId: context.tenant.tenantId,
        userId: context.actor.userId,
        resultCount: result.total,
        searchedAt: new Date(),
      });
    }

    await this.audit?.record({
      action: 'search.executed',
      entityType: 'SearchQuery',
      actorId: context.actor.userId,
      tenantId: context.tenant.tenantId,
      metadata: { term, mode, resultCount: result.total, tookMs: result.tookMs },
    });

    const payload: ISearchExecutedPayload = {
      tenantId: context.tenant.tenantId,
      userId: context.actor.userId,
      term,
      mode,
      resultCount: result.total,
      tookMs: result.tookMs,
    };
    await this.eventBus?.publish({
      eventName: SEARCH_EXECUTED_EVENT,
      payload,
      occurredAt: new Date(),
      tenantId: context.tenant.tenantId,
      correlationId: context.correlationId,
    });
  }
}
