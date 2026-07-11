/**
 * queue.service.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * The framework's main entry point for enqueueing work — every
 * JobProcessor, JobScheduler, and business-module caller goes through
 * this service rather than touching IQueueProvider/IQueueHandle directly.
 * Adds tenant-context stamping and structured logging on top of the raw
 * provider contract.
 */

import { Inject, Injectable } from '@nestjs/common';
import { AppLoggerService } from '../logger/app-logger.service';
import {
  IQueueCounts,
  IQueueJobOptions,
  IQueueProvider,
  IQueueProviderJob,
} from '../interfaces/background/queue-provider.interface';
import { QUEUE_PROVIDER } from '../interfaces/background/tokens';
import { JobSerializationUtil } from '../utils/background/job-serialization.util';

@Injectable()
export class QueueService {
  constructor(
    @Inject(QUEUE_PROVIDER) private readonly provider: IQueueProvider,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('QueueService');
  }

  async add<TPayload>(queueName: string, jobName: string, payload: TPayload, options?: IQueueJobOptions): Promise<string> {
    const safePayload = JobSerializationUtil.serialize(payload);
    const jobId = await this.provider.forQueue(queueName).add(jobName, safePayload, options);
    this.logger.debug(`Enqueued job "${jobName}" (${jobId}) on queue "${queueName}"`);
    return jobId;
  }

  async addBulk<TPayload>(
    queueName: string,
    jobs: { name: string; payload: TPayload; options?: IQueueJobOptions }[],
  ): Promise<string[]> {
    const safeJobs = jobs.map((j) => ({ ...j, payload: JobSerializationUtil.serialize(j.payload) }));
    const ids = await this.provider.forQueue(queueName).addBulk(safeJobs);
    this.logger.debug(`Enqueued ${ids.length} job(s) in bulk on queue "${queueName}"`);
    return ids;
  }

  async addDelayed<TPayload>(
    queueName: string,
    jobName: string,
    payload: TPayload,
    delayMs: number,
    options?: Omit<IQueueJobOptions, 'delayMs'>,
  ): Promise<string> {
    return this.add(queueName, jobName, payload, { ...options, delayMs });
  }

  getJob<TPayload = unknown>(queueName: string, jobId: string): Promise<IQueueProviderJob<TPayload> | null> {
    return this.provider.forQueue(queueName).getJob(jobId);
  }

  async cancelJob(queueName: string, jobId: string): Promise<boolean> {
    const removed = await this.provider.forQueue(queueName).removeJob(jobId);
    if (removed) this.logger.log(`Cancelled job "${jobId}" on queue "${queueName}"`);
    return removed;
  }

  async retryJob(queueName: string, jobId: string): Promise<boolean> {
    const retried = await this.provider.forQueue(queueName).retryJob(jobId);
    if (retried) this.logger.log(`Manually retried job "${jobId}" on queue "${queueName}"`);
    return retried;
  }

  /** Alias of retryJob — "requeue" is the term used in the queue-administration surface, kept distinct from automatic retry semantics. */
  requeueJob(queueName: string, jobId: string): Promise<boolean> {
    return this.retryJob(queueName, jobId);
  }

  getCounts(queueName: string): Promise<IQueueCounts> {
    return this.provider.forQueue(queueName).getCounts();
  }

  async pauseQueue(queueName: string): Promise<void> {
    await this.provider.forQueue(queueName).pause();
    this.logger.log(`Paused queue "${queueName}"`);
  }

  async resumeQueue(queueName: string): Promise<void> {
    await this.provider.forQueue(queueName).resume();
    this.logger.log(`Resumed queue "${queueName}"`);
  }

  isQueuePaused(queueName: string): Promise<boolean> {
    return this.provider.forQueue(queueName).isPaused();
  }

  async purgeQueue(queueName: string, status: 'completed' | 'failed' | 'all' = 'all'): Promise<number> {
    const purged = await this.provider.forQueue(queueName).purge(status);
    this.logger.log(`Purged ${purged} "${status}" job(s) from queue "${queueName}"`);
    return purged;
  }

  getJobs(
    queueName: string,
    statuses: IQueueProviderJob['status'][],
    start?: number,
    end?: number,
  ): Promise<IQueueProviderJob[]> {
    return this.provider.forQueue(queueName).getJobs(statuses, start, end);
  }

  /** For QueueMonitorService/BackgroundWorker — not for general call sites, which should stay on the methods above. */
  getProvider(): IQueueProvider {
    return this.provider;
  }
}
