/**
 * scheduler.interface.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 */

export interface IScheduleOptions {
  context?: { tenantId?: string; actorId?: string };
}

/**
 * IJobScheduler covers the "when" — cron, fixed-interval, one-time,
 * delayed, and calendar scheduling — always by ultimately enqueueing a job
 * through IQueueHandle. It deliberately does NOT reimplement cron/interval
 * bookkeeping: BackgroundJobScheduler (the concrete implementation) reuses
 * the existing CronService/TaskScheduler (infrastructure/scheduler) for
 * the actual timer/cron machinery and SchedulerRegistry bookkeeping,
 * retargeting only *where the tick enqueues to* (this framework's
 * QueueService instead of the RabbitMQ JobQueueService).
 */
export interface IJobScheduler {
  scheduleCron<TPayload>(
    taskName: string,
    cronExpression: string,
    queueName: string,
    jobName: string,
    payload: TPayload,
    options?: IScheduleOptions,
  ): void;

  scheduleInterval<TPayload>(
    taskName: string,
    intervalMs: number,
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

  scheduleCalendar<TPayload>(
    taskName: string,
    dates: Date[],
    queueName: string,
    jobName: string,
    payload: TPayload,
    options?: IScheduleOptions,
  ): void;

  unschedule(taskName: string): void;
  listScheduled(): { name: string; type: 'cron' | 'interval' | 'calendar'; expression: string }[];
}
