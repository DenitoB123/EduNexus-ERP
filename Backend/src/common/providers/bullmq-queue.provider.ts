/**
 * bullmq-queue.provider.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * Concrete `IQueueProvider` implementation on BullMQ/Redis. Reuses the
 * *existing* Redis connection config (`config/redis.config.ts` /
 * `AppConfigService.redis`) — the same Redis instance B1.x's cache layer
 * already connects to (see infrastructure/cache/cache.service.ts) —
 * rather than introducing a second Redis config surface. A distinct
 * `keyPrefix` suffix (`:bullmq`) is appended so BullMQ's key space cannot
 * collide with the cache layer's.
 *
 * Nothing outside this file imports `bullmq` directly — every consumer
 * (QueueService, BackgroundWorker, QueueMonitorService, ...) depends only
 * on IQueueProvider/IQueueHandle.
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, QueueEvents, Job, ConnectionOptions } from 'bullmq';
import { AppConfigService } from '../../config/app-config.service';
import { AppLoggerService } from '../logger/app-logger.service';
import {
  IQueueCounts,
  IQueueHandle,
  IQueueJobOptions,
  IQueueProvider,
  IQueueProviderJob,
  IQueueWorkerHandle,
  JobPriority,
} from '../interfaces/background/queue-provider.interface';

@Injectable()
export class BullMqQueueProvider implements IQueueProvider, OnModuleDestroy {
  private readonly connection: ConnectionOptions;
  private readonly handles = new Map<string, BullMqQueueHandle>();

  constructor(
    private readonly configService: AppConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('BullMqQueueProvider');
    const redis = this.configService.redis;

    // BullMQ manages its own Redis connections per Queue/Worker/QueueEvents
    // instance (its documented, recommended pattern) rather than sharing a
    // single ioredis instance — sharing one across bullmq's *own* bundled
    // ioredis version and the project's top-level ioredis dependency is a
    // real type conflict (two structurally-different `Redis` classes), not
    // just a style choice. Passing plain connection options here sidesteps
    // that entirely and lets each BullMQ construct manage its own client.
    this.connection = {
      host: redis.host,
      port: redis.port,
      password: redis.password,
      db: redis.db,
      tls: redis.tls ? {} : undefined,
      keyPrefix: `${redis.keyPrefix}bullmq:`,
      maxRetriesPerRequest: null, // required by BullMQ for blocking connections
    };
  }

  forQueue(queueName: string): IQueueHandle {
    let handle = this.handles.get(queueName);
    if (!handle) {
      handle = new BullMqQueueHandle(queueName, this.connection, this.logger);
      this.handles.set(queueName, handle);
    }
    return handle;
  }

  async shutdown(): Promise<void> {
    await Promise.all([...this.handles.values()].map((handle) => handle.closeAll()));
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }
}

class BullMqQueueHandle implements IQueueHandle {
  private readonly queue: Queue;
  private readonly queueEvents: QueueEvents;
  private readonly workers: Worker[] = [];

  constructor(
    public readonly queueName: string,
    private readonly connection: ConnectionOptions,
    private readonly logger: AppLoggerService,
  ) {
    this.queue = new Queue(queueName, { connection });
    this.queueEvents = new QueueEvents(queueName, { connection });
  }

  async add<TPayload>(jobName: string, payload: TPayload, options: IQueueJobOptions = {}): Promise<string> {
    const job = await this.queue.add(jobName, payload, this.toBullOptions(options));
    return job.id ?? '';
  }

  async addBulk<TPayload>(
    jobs: { name: string; payload: TPayload; options?: IQueueJobOptions }[],
  ): Promise<string[]> {
    const added = await this.queue.addBulk(
      jobs.map((j) => ({ name: j.name, data: j.payload, opts: this.toBullOptions(j.options ?? {}) })),
    );
    return added.map((j) => j.id ?? '');
  }

  async getJob<TPayload = unknown>(jobId: string): Promise<IQueueProviderJob<TPayload> | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    return this.toProviderJob(job);
  }

  async removeJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) return false;
    await job.remove();
    return true;
  }

  async retryJob(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) return false;
    await job.retry();
    return true;
  }

  async getCounts(): Promise<IQueueCounts> {
    const counts = await this.queue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed', 'paused');
    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      delayed: counts.delayed ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      paused: counts.paused ?? 0,
    };
  }

  async getJobs(
    statuses: IQueueProviderJob['status'][],
    start = 0,
    end = 99,
  ): Promise<IQueueProviderJob[]> {
    const bullStatuses = statuses.map((s) => (s === 'waiting' ? 'wait' : s)) as Parameters<Queue['getJobs']>[0];
    const jobs = await this.queue.getJobs(bullStatuses, start, end);
    return Promise.all(jobs.map((job) => this.toProviderJob(job)));
  }

  async pause(): Promise<void> {
    await this.queue.pause();
  }

  async resume(): Promise<void> {
    await this.queue.resume();
  }

  async isPaused(): Promise<boolean> {
    return this.queue.isPaused();
  }

  async purge(status: 'completed' | 'failed' | 'all' = 'all'): Promise<number> {
    let purged = 0;
    if (status === 'completed' || status === 'all') {
      const ids = await this.queue.clean(0, 0, 'completed');
      purged += ids.length;
    }
    if (status === 'failed' || status === 'all') {
      const ids = await this.queue.clean(0, 0, 'failed');
      purged += ids.length;
    }
    return purged;
  }

  registerProcessor<TPayload>(
    processor: (job: IQueueProviderJob<TPayload>) => Promise<unknown>,
    concurrency: number,
  ): IQueueWorkerHandle {
    const worker = new Worker(
      this.queueName,
      async (job: Job) => processor(await this.toProviderJob<TPayload>(job)),
      { connection: this.connection, concurrency },
    );

    worker.on('error', (err) => this.logger.error(`Worker error on queue "${this.queueName}"`, err.stack));

    this.workers.push(worker);
    return new BullMqWorkerHandle(this.queueName, concurrency, worker);
  }

  async closeAll(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
    await this.queueEvents.close();
    await this.queue.close();
  }

  private toBullOptions(options: IQueueJobOptions) {
    return {
      jobId: options.jobId,
      priority: options.priority ?? JobPriority.NORMAL,
      delay: options.delayMs,
      attempts: options.attempts,
      backoff: options.backoff ? { type: options.backoff.type, delay: options.backoff.delayMs } : undefined,
      removeOnComplete: options.removeOnComplete ?? 500,
      removeOnFail: options.removeOnFail ?? 1000,
      repeat: options.repeat
        ? {
            pattern: options.repeat.cron,
            every: options.repeat.everyMs,
            limit: options.repeat.limit,
            startDate: options.repeat.startAt,
            endDate: options.repeat.endAt,
          }
        : undefined,
    };
  }

  private async toProviderJob<TPayload = unknown>(job: Job): Promise<IQueueProviderJob<TPayload>> {
    const state = await job.getState();
    return {
      id: job.id ?? '',
      name: job.name,
      queueName: this.queueName,
      payload: job.data as TPayload,
      priority: job.opts.priority as JobPriority | undefined,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts ?? 1,
      status: (state === 'waiting-children' ? 'waiting' : state) as IQueueProviderJob['status'],
      progress: job.progress as number | Record<string, unknown> | undefined,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      failedReason: job.failedReason,
    };
  }
}

class BullMqWorkerHandle implements IQueueWorkerHandle {
  constructor(
    public readonly queueName: string,
    public readonly concurrency: number,
    private readonly worker: Worker,
  ) {}

  isRunning(): boolean {
    return this.worker.isRunning();
  }

  async close(): Promise<void> {
    await this.worker.close();
  }

  on(event: 'completed' | 'failed' | 'error', listener: (...args: unknown[]) => void): void {
    this.worker.on(event, listener);
  }
}
