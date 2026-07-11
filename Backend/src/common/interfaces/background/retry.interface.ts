/**
 * retry.interface.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * Distinct from `MessageRetryStrategy` (infrastructure/rabbitmq/retry-strategy.ts),
 * which is RabbitMQ-message-specific. This is the BullMQ-side policy
 * contract, applied when a job is enqueued (translated into BullMQ's own
 * `attempts`/`backoff` options by RetryPolicy) and consulted by
 * RetryTrackerService for attempt-history bookkeeping the queue engine
 * itself doesn't retain past job completion.
 */

export enum RetryStrategyType {
  EXPONENTIAL = 'exponential',
  LINEAR = 'linear',
  FIXED = 'fixed',
}

export interface IRetryPolicyConfig {
  maxAttempts: number;
  strategy: RetryStrategyType;
  baseDelayMs: number;
  maxDelayMs?: number;
  /** Adds up to +/-20% jitter to computed delays to avoid thundering-herd retries. Default true. */
  jitter?: boolean;
}

export interface IRetryPolicy {
  readonly config: IRetryPolicyConfig;
  shouldRetry(attemptsMade: number): boolean;
  nextDelayMs(attemptsMade: number): number;
}

export interface IRetryAttempt {
  jobId: string;
  jobName: string;
  attemptNumber: number;
  failedReason: string;
  occurredAt: Date;
}
