/**
 * background-job-service.interface.ts
 *
 * B2.9 — Enterprise Asynchronous Processing Framework
 *
 * The interface business modules depend on for background work
 * (`jobService.enqueue(...)`), per the dual-engine enterprise abstraction
 * requirement: modules never import BullMQ types directly, and never
 * touch QueueService/IQueueProvider/BullMqQueueProvider themselves.
 * Concrete implementation: BullMqBackgroundJobAdapter
 * (../../providers/bullmq-background-job.adapter.ts) — a facade over
 * QueueService + BackgroundJobScheduler + QueueMonitorService, all of
 * which remain the internal engine-facing layer this framework's own
 * workers/admin-controller/scheduler use directly.
 */

import { JobPriority } from './queue-provider.interface';
import { IJobContext } from './job.interface';
import { IScheduleOptions } from './scheduler.interface';
import { IQueueStatsSnapshot } from './monitoring.interface';

export const BACKGROUND_JOB_SERVICE = Symbol('BACKGROUND_JOB_SERVICE');

export interface IEnqueueOptions {
  priority?: JobPriority;
  delayMs?: number;
  attempts?: number;
  context?: IJobContext;
}

export interface IBackgroundJobService {
  enqueue<TPayload>(queueName: string, jobName: string, payload: TPayload, options?: IEnqueueOptions): Promise<string>;

  scheduleCron<TPayload>(
    taskName: string,
    cronExpression: string,
    queueName: string,
    jobName: string,
    payload: TPayload,
    options?: IScheduleOptions,
  ): void;

  scheduleOnce<TPayload>(
    queueName: string,
    jobName: string,
    payload: TPayload,
    runAt: Date,
    options?: IScheduleOptions,
  ): Promise<string>;

  cancel(queueName: string, jobId: string): Promise<boolean>;
  retry(queueName: string, jobId: string): Promise<boolean>;
  getStats(queueName: string): Promise<IQueueStatsSnapshot>;
}
