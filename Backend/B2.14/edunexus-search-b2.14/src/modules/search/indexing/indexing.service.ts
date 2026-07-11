/**
 * indexing.service.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 *
 * Central orchestration point for all index mutations: automatic/
 * incremental indexing of a single entity, bulk indexing, deletion, and
 * full reindex operations. Delegates actual persistence to the injected
 * ISearchEngine (SEARCH_ENGINE token — Prisma by default, swappable to
 * Elasticsearch/OpenSearch/Meilisearch), and delegates large/slow work to
 * the injected IQueueService (extension point) so indexing never blocks
 * the request that triggered it.
 *
 * Emits domain events (INDEX_DOCUMENT_UPSERTED_EVENT, etc.) and writes
 * audit entries for every index mutation and reindex operation, per the
 * B2.14 spec's Auditing requirements.
 */

import { Inject, Injectable, Optional } from '@nestjs/common';
import { SEARCH_ENGINE, EVENT_BUS, QUEUE_SERVICE, AUDIT_SERVICE, APP_LOGGER } from '../constants/tokens';
import { ISearchEngine } from '../engines/search-engine.interface';
import { IndexBuilder } from './index.builder';
import {
  IEventBus,
  IQueueService,
  IAuditService,
  IAppLogger,
} from '../interfaces/infrastructure.interfaces';
import { ISearchDocument, IIndexableEntity } from '../interfaces/search-document.interface';
import { IIndexingResult, IReindexOptions, IIndexingJobPayload } from '../interfaces/indexing.interface';
import {
  INDEX_DOCUMENT_UPSERTED_EVENT,
  INDEX_DOCUMENT_DELETED_EVENT,
  REINDEX_STARTED_EVENT,
  REINDEX_COMPLETED_EVENT,
  REINDEX_FAILED_EVENT,
} from '../events/search.events';
import { INDEXING_QUEUE_NAME, INDEXING_JOB_NAME, DEFAULT_REINDEX_BATCH_SIZE } from '../constants/search.constants';

/**
 * Contract a business module implements (typically once per entity type)
 * to make bulk reindexing possible: a way to page through every record of
 * that type for a tenant. This is the only place IndexingService needs to
 * reach back into business data, and it does so via an interface the
 * business module provides — never via a hardcoded Prisma model query.
 */
export interface IReindexSource {
  entityType: string;
  countAll(tenantId?: string): Promise<number>;
  fetchPage(tenantId: string | undefined, skip: number, take: number): Promise<IIndexableEntity[]>;
}

@Injectable()
export class IndexingService {
  private readonly reindexSources = new Map<string, IReindexSource>();

  constructor(
    @Inject(SEARCH_ENGINE) private readonly engine: ISearchEngine,
    private readonly indexBuilder: IndexBuilder,
    @Optional() @Inject(EVENT_BUS) private readonly eventBus?: IEventBus,
    @Optional() @Inject(QUEUE_SERVICE) private readonly queue?: IQueueService,
    @Optional() @Inject(AUDIT_SERVICE) private readonly audit?: IAuditService,
    @Optional() @Inject(APP_LOGGER) private readonly logger?: IAppLogger,
  ) {}

  /** Registers a reindex source for an entity type. Business modules call this once (e.g. from their module's onModuleInit) to participate in global reindexAll(). */
  registerReindexSource(source: IReindexSource): void {
    this.reindexSources.set(source.entityType, source);
  }

  // ---------------------------------------------------------------------
  // Automatic / incremental indexing (single entity)
  // ---------------------------------------------------------------------

  /** Indexes (or re-indexes) a single entity immediately. Called directly by business modules after create/update, or by IndexingWorker for background jobs. */
  async indexEntity(entity: IIndexableEntity, actorId?: string): Promise<void> {
    const document = this.indexBuilder.buildFromEntity(entity);
    await this.persistOne(document, actorId);
  }

  /** Indexes a pre-built (partial) search document directly — used by the manual/admin indexing API and by IndexingWorker when the job payload already carries document fields rather than an IIndexableEntity instance. */
  async indexDocument(partial: Omit<ISearchDocument, 'id' | 'indexedAt'>, actorId?: string): Promise<void> {
    const document = this.indexBuilder.buildFromPartial(partial);
    await this.persistOne(document, actorId);
  }

  /** Same as indexEntity(), but for entities using a registered mapper instead of implementing IIndexableEntity. */
  async indexByType<TEntity>(entityType: string, entity: TEntity, actorId?: string): Promise<void> {
    const document = this.indexBuilder.buildFromType(entityType, entity);
    await this.persistOne(document, actorId);
  }

  /** Enqueues indexing as a background job instead of running inline — recommended for high-throughput write paths. */
  async indexEntityAsync(payload: Omit<IIndexingJobPayload, 'type'>): Promise<void> {
    if (!this.queue) {
      this.logger?.warn('No QUEUE_SERVICE wired — falling back to synchronous indexing.', 'IndexingService');
      if (payload.document) {
        await this.indexDocument(payload.document, payload.requestedBy);
      }
      return;
    }
    await this.queue.enqueue(INDEXING_QUEUE_NAME, {
      name: INDEXING_JOB_NAME,
      payload: { ...payload, type: 'index' } as IIndexingJobPayload,
    });
  }

  async bulkIndex(documents: Omit<ISearchDocument, 'id' | 'indexedAt'>[], actorId?: string): Promise<IIndexingResult> {
    const start = Date.now();
    const built = documents.map((d) => this.indexBuilder.buildFromPartial(d));
    const result = await this.engine.bulkIndex(built);

    for (const doc of built) {
      await this.emitUpserted(doc);
    }
    await this.recordAudit('search.index.bulk', built[0]?.entityType ?? 'unknown', undefined, actorId, {
      count: built.length,
      indexed: result.indexed,
      failed: result.failed,
    });

    return { success: result.failed === 0, indexed: result.indexed, failed: result.failed, errors: result.errors, tookMs: Date.now() - start };
  }

  // ---------------------------------------------------------------------
  // Delete from index
  // ---------------------------------------------------------------------

  async removeFromIndex(entityType: string, entityId: string, tenantId: string, actorId?: string): Promise<void> {
    await this.engine.remove(entityType, entityId, tenantId);
    await this.recordAudit('search.index.delete', entityType, entityId, actorId, { tenantId });
    await this.eventBus?.publish({
      eventName: INDEX_DOCUMENT_DELETED_EVENT,
      payload: { tenantId, entityType, entityId },
      occurredAt: new Date(),
      tenantId,
    });
  }

  // ---------------------------------------------------------------------
  // Reindexing
  // ---------------------------------------------------------------------

  async reindex(options: IReindexOptions, actorId?: string): Promise<IIndexingResult | { queued: true }> {
    if (options.background !== false && this.queue) {
      await this.queue.enqueue(INDEXING_QUEUE_NAME, {
        name: INDEXING_JOB_NAME,
        payload: {
          type: options.entityType ? 'reindexEntityType' : 'reindexAll',
          entityType: options.entityType,
          tenantId: options.tenantId ?? '',
          requestedBy: actorId,
        } as IIndexingJobPayload,
      });
      return { queued: true };
    }
    return this.runReindex(options, actorId);
  }

  /** Runs the reindex synchronously. Called directly for small/foreground operations, or by IndexingWorker when processing a background reindex job. */
  async runReindex(options: IReindexOptions, actorId?: string): Promise<IIndexingResult> {
    const start = Date.now();
    const batchSize = options.batchSize ?? DEFAULT_REINDEX_BATCH_SIZE;
    const sources = options.entityType
      ? [this.requireSource(options.entityType)]
      : [...this.reindexSources.values()];

    await this.eventBus?.publish({
      eventName: REINDEX_STARTED_EVENT,
      payload: { tenantId: options.tenantId, entityType: options.entityType },
      occurredAt: new Date(),
      tenantId: options.tenantId,
    });

    let indexed = 0;
    const errors: { entityId?: string; message: string }[] = [];

    try {
      for (const source of sources) {
        if (options.entityType && source.entityType !== options.entityType) continue;

        // Remove stale entries for this entity type/tenant before rebuilding.
        await this.engine.removeMany(source.entityType, options.tenantId ?? '');

        const total = await source.countAll(options.tenantId);
        for (let skip = 0; skip < total; skip += batchSize) {
          const page = await source.fetchPage(options.tenantId, skip, batchSize);
          const documents = page.map((entity) => this.indexBuilder.buildFromEntity(entity));
          const result = await this.engine.bulkIndex(documents);
          indexed += result.indexed;
          errors.push(...result.errors);
        }
      }

      const tookMs = Date.now() - start;
      await this.recordAudit('search.reindex', options.entityType ?? 'all', undefined, actorId, {
        tenantId: options.tenantId,
        indexed,
        failed: errors.length,
        tookMs,
      });
      await this.eventBus?.publish({
        eventName: REINDEX_COMPLETED_EVENT,
        payload: { tenantId: options.tenantId, entityType: options.entityType, indexed, failed: errors.length, tookMs },
        occurredAt: new Date(),
        tenantId: options.tenantId,
      });

      return { success: errors.length === 0, indexed, failed: errors.length, errors, tookMs };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error(`Reindex failed: ${message}`, error instanceof Error ? error.stack : undefined, 'IndexingService');
      await this.eventBus?.publish({
        eventName: REINDEX_FAILED_EVENT,
        payload: { tenantId: options.tenantId, entityType: options.entityType, error: message },
        occurredAt: new Date(),
        tenantId: options.tenantId,
      });
      throw error;
    }
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  private async persistOne(document: ISearchDocument, actorId?: string): Promise<void> {
    await this.engine.index(document);
    await this.emitUpserted(document);
    await this.recordAudit('search.index.upsert', document.entityType, document.entityId, actorId, {
      tenantId: document.tenantId,
    });
  }

  private async emitUpserted(document: ISearchDocument): Promise<void> {
    await this.eventBus?.publish({
      eventName: INDEX_DOCUMENT_UPSERTED_EVENT,
      payload: { tenantId: document.tenantId, entityType: document.entityType, entityId: document.entityId, module: document.module },
      occurredAt: new Date(),
      tenantId: document.tenantId,
    });
  }

  private async recordAudit(
    action: string,
    entityType: string,
    entityId: string | undefined,
    actorId: string | undefined,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.audit?.record({ action, entityType, entityId, actorId, metadata });
  }

  private requireSource(entityType: string): IReindexSource {
    const source = this.reindexSources.get(entityType);
    if (!source) {
      throw new Error(`No reindex source registered for entityType "${entityType}". Call IndexingService.registerReindexSource() from that module.`);
    }
    return source;
  }
}
