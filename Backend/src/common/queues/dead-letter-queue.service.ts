/**
 * dead-letter-queue.service.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * BullMQ has no native "DLQ" concept — failed jobs simply stay in the
 * queue's `failed` set until cleaned. This service is the equivalent of
 * infrastructure/jobs/failed-job-recovery.service.ts (RabbitMQ's DLQ
 * replay) for this framework: list failed jobs and replay them back onto
 * the live queue via a fresh `add()`, rather than reusing BullMQ's
 * `retry()` (which re-runs the *same* job id and can conflict with
 * `removeOnFail` cleanup timing on busy queues).
 */

import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../logger/app-logger.service';
import { QueueService } from './queue.service';

@Injectable()
export class DeadLetterQueueService {
  constructor(
    private readonly queueService: QueueService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('DeadLetterQueueService');
  }

  async listFailed(queueName: string, limit = 50) {
    return this.queueService.getJobs(queueName, ['failed'], 0, limit - 1);
  }

  /** Re-enqueues up to `limit` failed jobs as brand-new jobs (fresh attempt counter) and removes the originals. */
  async replayFailed(queueName: string, limit = 50): Promise<number> {
    const failedJobs = await this.listFailed(queueName, limit);
    let replayed = 0;

    for (const job of failedJobs) {
      await this.queueService.add(queueName, job.name, job.payload);
      await this.queueService.cancelJob(queueName, job.id);
      replayed += 1;
    }

    this.logger.log(`Replayed ${replayed} failed job(s) on queue "${queueName}"`);
    return replayed;
  }

  async purgeFailed(queueName: string): Promise<number> {
    return this.queueService.purgeQueue(queueName, 'failed');
  }
}
