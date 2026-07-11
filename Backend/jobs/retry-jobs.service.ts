import { Injectable } from '@nestjs/common';
import { DelayedJobsService } from './delayed-jobs.service';
import { QueueMonitoringService } from './queue-monitoring.service';
import { MessageRetryStrategy } from '../rabbitmq/retry-strategy';
import { JobPayload } from '../interfaces/job.interface';

@Injectable()
export class RetryJobsService {
  constructor(
    private readonly delayedJobsService: DelayedJobsService,
    private readonly monitoring: QueueMonitoringService,
  ) {}

  shouldRetry(payload: JobPayload): boolean {
    return MessageRetryStrategy.shouldRetry(payload.attempts, payload.maxAttempts);
  }

  async retry<T>(payload: JobPayload<T>): Promise<string> {
    const delayMs = MessageRetryStrategy.nextDelayMs(payload.attempts);
    const nextPayload: JobPayload<T> = { ...payload, attempts: payload.attempts + 1 };

    this.monitoring.recordRetried();
    await this.delayedJobsService.enqueueRaw(nextPayload, delayMs);
    return nextPayload.jobId;
  }
}
