/**
 * search.module.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 *
 * Standalone, parallel-milestone module (per B2.21 consolidation plan).
 * Assumes only the Enterprise Backend Foundation (B1.1–B2.2) exists;
 * consumes PrismaService, Event Bus, Queue, Logger, Audit, Auth/RBAC, and
 * Multi-tenancy exclusively via the DI tokens in constants/tokens.ts.
 *
 * Usage once merged during B2.21 (illustrative — host app supplies real providers):
 *
 *   @Module({
 *     imports: [
 *       SearchModule.forRoot({
 *         providers: [
 *           { provide: PRISMA_SERVICE, useExisting: PrismaService },
 *           { provide: EVENT_BUS, useExisting: EventBusService },
 *           { provide: QUEUE_SERVICE, useExisting: QueueService },
 *           { provide: APP_LOGGER, useExisting: LoggerService },
 *           { provide: AUDIT_SERVICE, useExisting: AuditService },
 *           { provide: PERMISSION_CHECKER, useExisting: RbacService },
 *         ],
 *       }),
 *     ],
 *   })
 *   export class AppModule {}
 *
 * The default SEARCH_ENGINE is PrismaSearchEngine (works with only
 * PRISMA_SERVICE wired). To use Elasticsearch/OpenSearch instead, pass
 * `engine: 'elastic'` (plus an ELASTIC_CLIENT provider) to forRoot() — no
 * business module changes required either way.
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { IndexingService } from './indexing/indexing.service';
import { IndexingWorker } from './indexing/indexing.worker';
import { IndexBuilder } from './indexing/index.builder';
import { PrismaSearchEngine } from './engines/prisma-search.engine';
import { ElasticSearchAdapter } from './engines/elastic.adapter';
import { QueryParserService } from './query/query-parser.service';
import { FilterBuilderService } from './query/filter-builder.service';
import { RankingService } from './ranking/ranking.service';
import { SearchCacheService } from './cache/search-cache.service';
import { InMemorySearchLogStore } from './cache/in-memory-search-log.store';
import { SEARCH_ENGINE, SEARCH_LOG_STORE } from './constants/tokens';

export interface SearchModuleOptions {
  /** Which built-in engine to register under SEARCH_ENGINE. Default: 'prisma'. Pass 'custom' and supply your own SEARCH_ENGINE provider in `providers` to use Meilisearch or anything else. */
  engine?: 'prisma' | 'elastic' | 'custom';
  /** Extension-point providers: PRISMA_SERVICE, EVENT_BUS, QUEUE_SERVICE, APP_LOGGER, AUDIT_SERVICE, PERMISSION_CHECKER, CACHE_CLIENT, and (if engine: 'elastic') ELASTIC_CLIENT, supplied by the host app. */
  providers?: Provider[];
  /** Override the default in-memory ISearchLogStore with a persistent implementation. */
  searchLogStore?: Provider;
}

const CORE_PROVIDERS: Provider[] = [
  SearchService,
  IndexingService,
  IndexingWorker,
  IndexBuilder,
  QueryParserService,
  FilterBuilderService,
  RankingService,
  SearchCacheService,
  PrismaSearchEngine,
  ElasticSearchAdapter,
];

function resolveEngineProvider(engine: SearchModuleOptions['engine']): Provider[] {
  if (engine === 'elastic') {
    return [{ provide: SEARCH_ENGINE, useExisting: ElasticSearchAdapter }];
  }
  if (engine === 'custom') {
    // Caller is expected to supply their own SEARCH_ENGINE provider via `providers`.
    return [];
  }
  return [{ provide: SEARCH_ENGINE, useExisting: PrismaSearchEngine }];
}

@Module({})
export class SearchModule {
  static forRoot(options: SearchModuleOptions = {}): DynamicModule {
    const engineProvider = resolveEngineProvider(options.engine ?? 'prisma');
    const logStoreProvider: Provider = options.searchLogStore ?? {
      provide: SEARCH_LOG_STORE,
      useClass: InMemorySearchLogStore,
    };

    return {
      module: SearchModule,
      controllers: [SearchController],
      providers: [...CORE_PROVIDERS, ...engineProvider, logStoreProvider, ...(options.providers ?? [])],
      exports: [SearchService, IndexingService, IndexBuilder],
    };
  }
}
