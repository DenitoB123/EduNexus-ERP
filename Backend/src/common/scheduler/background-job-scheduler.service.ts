/**
 * background-job-scheduler.service.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * Concrete IJobScheduler. Does NOT reimplement cron/interval timer
 * machinery — reuses the existing infrastructure/scheduler CronService
 * (cron) and TaskScheduler (interval/timeout), which already wrap
 * @nestjs/schedule's SchedulerRegistry and ScheduledTaskRegistry. This
 * class only supplies *what happens on each tick*: enqueue onto this
 * framework's QueueService (BullMQ) instead of the RabbitMQ
 * JobQueueService that QueueScheduler (infrastructure/scheduler/queue-scheduler.service.ts)
 * targets — the same relationship QueueScheduler already has with
 * CronService, mirrored for this framework's queue engine.
 *
 * `scheduleOnce`/calendar scheduling go through QueueService.addDelayed
 * directly (BullMQ's own delayed-job support), not through CronService —
 * consistent with how DelayedJobsService/ScheduledJobsService already
 * separate "one-time at a timestamp" from "recurring on a cron" in the
 * RabbitMQ framework.
 */

import { Injectable } from '@nestjs/common';
import { CronService } from '../../infrastructure/scheduler/cron.service';
import { TaskScheduler } from '../../infrastructure/scheduler/task-scheduler.service';
import { AppLoggerService } from '../logger/app-logger.service';
import { QueueService } from '../queues/queue.service';
import { IJobScheduler, IScheduleOptions } from '../interfaces/background/scheduler.interface';
import { BackgroundJobType, IBackgroundJobEnvelope } from '../interfaces/background/job.interface';
import { DelayCalculationUtil } from '../utils/background/delay-calculation.util';

interface ScheduledEntry {
  name: string;
  type: 'cron' | 'interval' | 'calendar';
  expression: string;
}

@Injectable()
export class BackgroundJobScheduler implements IJobScheduler {
  private readonly entries = new Map<string, ScheduledEntry>();
  private readonly calendarTaskNamesByBase = new Map<string, string[]>();

  constructor(
    private readonly cronService: CronService,
    private readonly taskScheduler: TaskScheduler,
    private readonly queueService: QueueService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('BackgroundJobScheduler');
  }

  scheduleCron<TPayload>(
    taskName: string,
    cronExpression: string,
    queueName: string,
    jobName: string,
    payload: TPayload,
    options?: IScheduleOptions,
  ): void {
    this.cronService.addCron(taskName, cronExpression, async () => {
      await this.queueService.add(queueName, jobName, this.withContext(payload, options));
    });
    this.entries.set(taskName, { name: taskName, type: 'cron', expression: cronExpression });
  }

  scheduleInterval<TPayload>(
    taskName: string,
    intervalMs: number,
    queueName: string,
    jobName: string,
    payload: TPayload,
    options?: IScheduleOptions,
  ): void {
    this.taskScheduler.addInterval(taskName, intervalMs, async () => {
      await this.queueService.add(queueName, jobName, this.withContext(payload, options));
    });
    this.entries.set(taskName, { name: taskName, type: 'interval', expression: `every ${intervalMs}ms` });
  }

  async scheduleOnce<TPayload>(
    queueName: string,
    jobName: string,
    payload: TPayload,
    runAt: Date,
    options?: IScheduleOptions,
  ): Promise<string> {
    const delayMs = DelayCalculationUtil.msUntil(runAt);
    return this.queueService.addDelayed(queueName, jobName, this.withContext(payload, options), delayMs);
  }

  scheduleCalendar<TPayload>(
    taskName: string,
    dates: Date[],
    queueName: string,
    jobName: string,
    payload: TPayload,
    options?: IScheduleOptions,
  ): void {
    const taskNames: string[] = [];

    for (const date of dates) {
      const occurrenceName = DelayCalculationUtil.calendarTaskName(taskName, date);
      const delayMs = DelayCalculationUtil.msUntil(date);

      this.taskScheduler.addTimeout(occurrenceName, delayMs, async () => {
        await this.queueService.add(queueName, jobName, this.withContext(payload, options));
      });

      taskNames.push(occurrenceName);
    }

    this.calendarTaskNamesByBase.set(taskName, taskNames);
    this.entries.set(taskName, {
      name: taskName,
      type: 'calendar',
      expression: `${dates.length} date(s), first ${dates[0]?.toISOString() ?? 'n/a'}`,
    });
  }

  unschedule(taskName: string): void {
    const entry = this.entries.get(taskName);
    if (!entry) return;

    if (entry.type === 'cron') {
      this.cronService.removeCron(taskName);
    } else if (entry.type === 'interval') {
      this.taskScheduler.removeInterval(taskName);
    } else {
      for (const occurrenceName of this.calendarTaskNamesByBase.get(taskName) ?? []) {
        this.taskScheduler.removeTimeout(occurrenceName);
      }
      this.calendarTaskNamesByBase.delete(taskName);
    }

    this.entries.delete(taskName);
    this.logger.log(`Unscheduled task "${taskName}"`);
  }

  listScheduled(): { name: string; type: 'cron' | 'interval' | 'calendar'; expression: string }[] {
    return [...this.entries.values()];
  }

  private withContext<TPayload>(payload: TPayload, options?: IScheduleOptions): IBackgroundJobEnvelope<TPayload> {
    // Scheduler doesn't know which processor will receive this job, so it
    // can't know that processor's declared jobType statically. Scheduled
    // jobs default to RETRYABLE (BullMQ's own attempts/backoff options,
    // set separately via IQueueJobOptions on the enqueue call, are what
    // actually governs retry behavior) — this field only affects the
    // logging/eventing done in JobProcessorBase, not execution semantics.
    return { jobType: BackgroundJobType.RETRYABLE, context: options?.context ?? {}, payload };
  }
}
