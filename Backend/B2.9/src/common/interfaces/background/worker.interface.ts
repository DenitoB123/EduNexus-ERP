/**
 * worker.interface.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 */

export interface IWorkerPoolOptions {
  /** Number of jobs this worker pool processes concurrently for its queue. */
  concurrency: number;
  /** Max ms to wait for active jobs to finish during shutdown before forcing close. */
  gracefulShutdownTimeoutMs?: number;
  /** Restart the worker automatically if the underlying connection drops. Default true. */
  autoRecover?: boolean;
}

export interface IWorkerStats {
  queueName: string;
  concurrency: number;
  running: boolean;
  jobsProcessed: number;
  jobsFailed: number;
  startedAt: Date;
}

/**
 * A BackgroundWorker binds one IJobProcessor to one queue with a
 * concurrency setting (the "worker pool" — BullMQ's Worker natively
 * processes up to `concurrency` jobs in parallel from one process, which
 * is the pool; running multiple app instances/replicas scales it further
 * without any code change here).
 */
export interface IBackgroundWorker {
  readonly queueName: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  getStats(): IWorkerStats;
}
