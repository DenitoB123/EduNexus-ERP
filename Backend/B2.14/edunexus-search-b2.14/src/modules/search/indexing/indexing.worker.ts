/**
 * indexing.worker.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 *
 * Background consumer for jobs enqueued onto INDEXING_QUEUE_NAME by
 * IndexingService (indexEntityAsync, reindex with background=true). This
 * class does NOT implement a queue itself — it registers a handler against
 * the injected IQueueService (extension point; concrete implementation is
 * the Queue System assumed to exist per B1.1–B2.2, e.g. a BullMQ/SQS-backed
 * service). If the host's queue infrastructure uses a different
 * registration mechanism (e.g. a `@Processor()` decorator from a specific
 * queue library), `process()` below is the exact logic that decorator's
 * handler should call — copy/wire accordingly during B2.21 consolidation.
 */

import { Injectable, OnModuleInit, Optional, Inject } from '@nestjs/common';
import { QUEUE_SERVICE, APP_LOGGER } from '../constants/tokens';
import { IQueueService, IQueueJob, IAppLogger } from '../interfaces/infrastructure.interfaces';
import { IIndexingJobPayload } from '../interfaces/indexing.interface';
import { IndexingService } from './indexing.service';
import { INDEXING_QUEUE_NAME } from '../constants/search.constants';

@Injectable()
export class IndexingWorker implements OnModuleInit {
  constructor(
    private readonly indexingService: IndexingService,
    @Optional() @Inject(QUEUE_SERVICE) private readonly queue?: IQueueService,
    @Optional() @Inject(APP_LOGGER) private readonly logger?: IAppLogger,
  ) {}

  onModuleInit(): void {
    if (!this.queue?.registerConsumer) {
      this.logger?.warn(
        'No QUEUE_SERVICE.registerConsumer available — background indexing jobs will not be processed automatically. ' +
          'IndexingService falls back to synchronous execution when enqueue is unavailable.',
        'IndexingWorker',
      );
      return;
    }
    this.queue.registerConsumer<IIndexingJobPayload>(INDEXING_QUEUE_NAME, (job) => this.process(job));
  }

  /** The actual job-processing logic, exposed publicly so it can be invoked directly by whatever mechanism the host's concrete queue library uses (decorator-based processor, manual polling loop, etc.). */
  async process(job: IQueueJob<IIndexingJobPayload>): Promise<void> {
    const payload = job.payload;
    this.logger?.debug(`Processing indexing job: ${payload.type}`, 'IndexingWorker', { entityType: payload.entityType });

    try {
      switch (payload.type) {
        case 'index':
          if (!payload.document) throw new Error('index job missing document payload.');
          await this.indexingService.indexDocument(payload.document, payload.requestedBy);
          break;

        case 'bulkIndex':
          if (!payload.documents) throw new Error('bulkIndex job missing documents payload.');
          await this.indexingService.bulkIndex(payload.documents, payload.requestedBy);
          break;

        case 'delete':
          if (!payload.entityType || !payload.entityId) throw new Error('delete job missing entityType/entityId.');
          await this.indexingService.removeFromIndex(payload.entityType, payload.entityId, payload.tenantId, payload.requestedBy);
          break;

        case 'reindexEntityType':
        case 'reindexAll':
          await this.indexingService.runReindex(
            { entityType: payload.entityType, tenantId: payload.tenantId || undefined },
            payload.requestedBy,
          );
          break;

        default:
          this.logger?.warn(`Unknown indexing job type: ${(payload as { type: string }).type}`, 'IndexingWorker');
      }
    } catch (error) {
      this.logger?.error(
        `Indexing job failed: ${payload.type}`,
        error instanceof Error ? error.stack : undefined,
        'IndexingWorker',
        { entityType: payload.entityType, entityId: payload.entityId },
      );
      throw error;
    }
  }
}
