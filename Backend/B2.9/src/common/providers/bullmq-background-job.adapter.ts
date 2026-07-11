/**
 * bullmq-background-job.adapter.ts
 *
 * B2.9 — Enterprise Asynchronous Processing Framework
 *
 * The adapter business modules actually inject (via BACKGROUND_JOB_SERVICE)
 * for background work. A facade over this framework's internal
 * engine-facing services (QueueService, BackgroundJobScheduler,
 * QueueMonitorService) — those remain available for this framework's own
 * internals (workers, admin controller) that need the fuller surface;
 * business modules get the smaller IBackgroundJobService contract so
 * swapping the underlying engine later never touches their code.
 */

import { Inject, Injectable } from '@nestjs/common';
import {
  IBackgroundJobService,
  IEnqueueOptions,
} from '../interfaces/background/background-job-service.interface';
import { IScheduleOptions } from '../interfaces/background/scheduler.interface';
import { IQueueStatsSnapshot } from '../interfaces/background/monitoring.interface';
import { JOB_SCHEDULER, QUEUE_MONITOR } from '../interfaces/background/tokens';
import { IJobScheduler } from '../interfaces/background/scheduler.interface';
import { IQueueMonitor } from '../interfaces/background/monitoring.interface';
import { QueueService } from '../queues/queue.service';

@Injectable()
export class BullMqBackgroundJobAdapter implements IBackgroundJobService {
  constructor(
    private readonly queueService: QueueService,
    @Inject(JOB_SCHEDULER) private readonly scheduler: IJobScheduler,
    @Inject(QUEUE_MONITOR) private readonly monitor: IQueueMonitor,
  ) {}

  enqueue<TPayload>(queueName: string, jobName: string, payload: TPayload, options?: IEnqueueOptions): Promise<string> {
    return this.queueService.add(queueName, jobName, payload, {
      priority: options?.priority,
      delayMs: options?.delayMs,
      attempts: options?.attempts,
    });
  }

  scheduleCron<TPayload>(
    taskName: string,
    cronExpression: string,
    queueName: string,
    jobName: string,
    payload: TPayload,
    options?: IScheduleOptions,
  ): void {
    this.scheduler.scheduleCron(taskName, cronExpression, queueName, jobName, payload, options);
  }

  scheduleOnce<TPayload>(
    queueName: string,
    jobName: string,
    payload: TPayload,
    runAt: Date,
    options?: IScheduleOptions,
  ): Promise<string> {
    return this.scheduler.scheduleOnce(queueName, jobName, payload, runAt, options);
  }

  cancel(queueName: string, jobId: string): Promise<boolean> {
    return this.queueService.cancelJob(queueName, jobId);
  }

  retry(queueName: string, jobId: string): Promise<boolean> {
    return this.queueService.retryJob(queueName, jobId);
  }

  getStats(queueName: string): Promise<IQueueStatsSnapshot> {
    return this.monitor.getQueueStats(queueName);
  }
}
