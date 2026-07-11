/**
 * retry-policy.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 */

import {
  IRetryPolicy,
  IRetryPolicyConfig,
  RetryStrategyType,
} from '../interfaces/background/retry.interface';
import { RetryCalculationUtil } from '../utils/background/retry-calculation.util';

export class RetryPolicy implements IRetryPolicy {
  constructor(public readonly config: IRetryPolicyConfig) {}

  static exponential(maxAttempts = 5, baseDelayMs = 2000): RetryPolicy {
    return new RetryPolicy({ maxAttempts, strategy: RetryStrategyType.EXPONENTIAL, baseDelayMs });
  }

  static linear(maxAttempts = 5, baseDelayMs = 5000): RetryPolicy {
    return new RetryPolicy({ maxAttempts, strategy: RetryStrategyType.LINEAR, baseDelayMs });
  }

  static fixed(maxAttempts = 3, delayMs = 10_000): RetryPolicy {
    return new RetryPolicy({ maxAttempts, strategy: RetryStrategyType.FIXED, baseDelayMs: delayMs });
  }

  shouldRetry(attemptsMade: number): boolean {
    return attemptsMade < this.config.maxAttempts;
  }

  nextDelayMs(attemptsMade: number): number {
    return RetryCalculationUtil.computeDelayMs(
      this.config.strategy,
      attemptsMade,
      this.config.baseDelayMs,
      this.config.maxDelayMs,
      this.config.jitter ?? true,
    );
  }

  /** Translates to BullMQ's native attempts/backoff job options, so a job enrolled with a RetryPolicy gets automatic engine-level retries instead of this framework re-implementing retry scheduling on top of BullMQ's own. */
  toQueueJobOptions(): { attempts: number; backoff: { type: 'exponential' | 'linear'; delayMs: number } } {
    return {
      attempts: this.config.maxAttempts,
      backoff: {
        type: this.config.strategy === RetryStrategyType.LINEAR ? 'linear' : 'exponential',
        delayMs: this.config.baseDelayMs,
      },
    };
  }
}
