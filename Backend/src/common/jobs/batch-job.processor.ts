/**
 * batch-job.processor.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * Base class for BATCH jobs: splits a large item list into fixed-size
 * chunks and enqueues one job per chunk (via QueueService.addBulk),
 * tagged with `envelope.batch` so BatchJobProcessor.execute() knows which
 * slice it's handling and progress can be reported per-chunk. Concrete
 * subclasses implement `processChunk()`; `enqueueBatch()` is the entry
 * point callers use to kick a batch off.
 */

import { randomUUID } from 'crypto';
import { BackgroundJobType, IBackgroundJobEnvelope, IJobContext } from '../interfaces/background/job.interface';
import { JobProcessorBase } from './job-processor.base';
import { QueueService } from '../queues/queue.service';

export abstract class BatchJobProcessor<TItem = unknown, TChunkResult = unknown> extends JobProcessorBase<
  TItem[],
  TChunkResult
> {
  readonly jobType = BackgroundJobType.BATCH;

  protected abstract readonly queueName: string;
  protected abstract readonly chunkSize: number;

  protected abstract processChunk(
    items: TItem[],
    envelope: IBackgroundJobEnvelope<TItem[]>,
  ): Promise<TChunkResult>;

  protected async execute(
    envelope: IBackgroundJobEnvelope<TItem[]>,
    reportProgress: (pct: number) => Promise<void>,
  ): Promise<TChunkResult> {
    await reportProgress(0);
    const result = await this.processChunk(envelope.payload, envelope);
    await reportProgress(100);
    return result;
  }

  /** Splits `items` into chunks of `chunkSize` and enqueues one job per chunk. Call this from a service, not from within a running job. */
  async enqueueBatch(queueService: QueueService, items: TItem[], context: IJobContext = {}): Promise<string[]> {
    const batchId = randomUUID();
    const chunks: TItem[][] = [];
    for (let i = 0; i < items.length; i += this.chunkSize) {
      chunks.push(items.slice(i, i + this.chunkSize));
    }

    return queueService.addBulk<IBackgroundJobEnvelope<TItem[]>>(
      this.queueName,
      chunks.map((chunk, index) => ({
        name: this.jobName,
        payload: {
          jobType: this.jobType,
          context,
          payload: chunk,
          batch: { batchId, chunkIndex: index, totalChunks: chunks.length },
        },
      })),
    );
  }
}
