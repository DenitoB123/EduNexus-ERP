/**
 * retry-calculation.util.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 */

import { RetryStrategyType } from '../../interfaces/background/retry.interface';

export class RetryCalculationUtil {
  static computeDelayMs(
    strategy: RetryStrategyType,
    attemptsMade: number,
    baseDelayMs: number,
    maxDelayMs = 5 * 60_000,
    jitter = true,
  ): number {
    let delay: number;

    switch (strategy) {
      case RetryStrategyType.EXPONENTIAL:
        delay = baseDelayMs * 2 ** attemptsMade;
        break;
      case RetryStrategyType.LINEAR:
        delay = baseDelayMs * (attemptsMade + 1);
        break;
      case RetryStrategyType.FIXED:
      default:
        delay = baseDelayMs;
        break;
    }

    delay = Math.min(delay, maxDelayMs);

    if (jitter) {
      const jitterFactor = 0.8 + Math.random() * 0.4; // +/-20%
      delay = Math.round(delay * jitterFactor);
    }

    return delay;
  }
}
