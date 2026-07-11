/**
 * retry-tracker.service.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * BullMQ discards a job's attempt history once it's cleaned up
 * (removeOnComplete/removeOnFail), so this in-memory ring buffer keeps a
 * short-lived record for the monitoring surface. This is intentionally
 * NOT a system of record — for durable retry/audit history, JobProcessorBase
 * publishes a domain event per attempt via DOMAIN_EVENT_PUBLISHER (B2.3),
 * which downstream consumers can persist if they need long-term audit
 * trails. Swap this for a Redis- or DB-backed store in a future milestone
 * without changing JobProcessorBase's call site if in-memory turns out to
 * be insufficient.
 */

import { Injectable } from '@nestjs/common';
import { IRetryAttempt } from '../interfaces/background/retry.interface';

const MAX_RECORDS_PER_QUEUE = 500;

@Injectable()
export class RetryTrackerService {
  private readonly attemptsByQueue = new Map<string, IRetryAttempt[]>();

  record(queueName: string, attempt: IRetryAttempt): void {
    const list = this.attemptsByQueue.get(queueName) ?? [];
    list.push(attempt);
    if (list.length > MAX_RECORDS_PER_QUEUE) list.shift();
    this.attemptsByQueue.set(queueName, list);
  }

  getRecentAttempts(queueName: string, jobId?: string): IRetryAttempt[] {
    const list = this.attemptsByQueue.get(queueName) ?? [];
    return jobId ? list.filter((a) => a.jobId === jobId) : list;
  }
}
