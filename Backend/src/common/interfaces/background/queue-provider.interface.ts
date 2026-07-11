/**
 * queue-provider.interface.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * `IQueueProvider` is the abstraction every concrete queue engine
 * implements. B2.9 ships `BullMqQueueProvider` (Redis/BullMQ) as the
 * concrete provider bound to the QUEUE_PROVIDER token — but nothing above
 * this interface (QueueService, JobScheduler, BackgroundWorker, etc.)
 * imports BullMQ directly, so a second engine can be added later by
 * writing one more IQueueProvider implementation and swapping the binding
 * in background.module.ts. Nothing else changes.
 *
 * This intentionally does NOT replace the existing RabbitMQ-based
 * JobModule/SchedulerModule (infrastructure/jobs, infrastructure/rabbitmq,
 * infrastructure/scheduler) — both frameworks are available; this one adds
 * the capabilities the RabbitMQ framework doesn't have (true priority
 * queues, worker pools with concurrency, pause/resume/purge queue
 * administration, structured job status/progress tracking). See
 * IMPLEMENTATION_SUMMARY_B2_9.md for the full comparison and guidance on
 * which to use for a given job.
 */

export enum JobPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
  BULK = 5,
}

export interface IQueueJobOptions {
  jobId?: string;
  priority?: JobPriority;
  delayMs?: number;
  attempts?: number;
  backoff?: { type: 'exponential' | 'linear'; delayMs: number };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  /** Cron expression for a recurring job, or a fixed interval in ms. Mutually exclusive with delayMs. */
  repeat?: { cron?: string; everyMs?: number; limit?: number; startAt?: Date; endAt?: Date };
}

export interface IQueueProviderJob<TPayload = unknown> {
  id: string;
  name: string;
  queueName: string;
  payload: TPayload;
  priority?: JobPriority;
  attemptsMade: number;
  maxAttempts: number;
  status: 'waiting' | 'delayed' | 'active' | 'completed' | 'failed' | 'paused';
  progress?: number | Record<string, unknown>;
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
  failedReason?: string;
}

export interface IQueueCounts {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  paused: number;
}

/**
 * Engine-agnostic queue provider contract. One instance per named queue,
 * obtained via IQueueProvider.forQueue(queueName) — mirrors how BullMQ
 * itself scopes a Queue object to one named queue, which keeps the
 * abstraction honest rather than forcing a leaky "pass queueName to every
 * call" shape onto a future engine that doesn't work that way.
 */
export interface IQueueProvider {
  /** Returns (creating if necessary) the handle for a named queue. */
  forQueue(queueName: string): IQueueHandle;
  /** Graceful shutdown of every open connection this provider holds. */
  shutdown(): Promise<void>;
}

export interface IQueueHandle {
  readonly queueName: string;

  add<TPayload>(jobName: string, payload: TPayload, options?: IQueueJobOptions): Promise<string>;
  addBulk<TPayload>(
    jobs: { name: string; payload: TPayload; options?: IQueueJobOptions }[],
  ): Promise<string[]>;

  getJob<TPayload = unknown>(jobId: string): Promise<IQueueProviderJob<TPayload> | null>;
  removeJob(jobId: string): Promise<boolean>;
  retryJob(jobId: string): Promise<boolean>;

  getCounts(): Promise<IQueueCounts>;
  getJobs(
    statuses: IQueueProviderJob['status'][],
    start?: number,
    end?: number,
  ): Promise<IQueueProviderJob[]>;

  pause(): Promise<void>;
  resume(): Promise<void>;
  isPaused(): Promise<boolean>;
  purge(status?: 'completed' | 'failed' | 'all'): Promise<number>;

  /** Registers the function BullMQ (or any engine) calls per job. Concurrency = worker pool size for this queue. */
  registerProcessor<TPayload>(
    processor: (job: IQueueProviderJob<TPayload>) => Promise<unknown>,
    concurrency: number,
  ): IQueueWorkerHandle;
}

export interface IQueueWorkerHandle {
  readonly queueName: string;
  readonly concurrency: number;
  isRunning(): boolean;
  close(): Promise<void>;
  on(event: 'completed' | 'failed' | 'error', listener: (...args: unknown[]) => void): void;
}
