import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueManager } from '../rabbitmq/queue-manager.service';
import { ConsumerService } from '../rabbitmq/consumer.service';
import { JobRegistry } from './job-registry.service';
import { RetryJobsService } from './retry-jobs.service';
import { QueueMonitoringService } from './queue-monitoring.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { JOBS_QUEUE_NAME, JOBS_ROUTING_KEY } from './job.constants';
import { IConsumerHandler, QueueMessage } from '../interfaces/queue.interface';
import { JobPayload } from '../interfaces/job.interface';

@Injectable()
export class WorkerManagerService implements OnModuleInit {
  constructor(
    private readonly queueManager: QueueManager,
    private readonly consumerService: ConsumerService,
    private readonly jobRegistry: JobRegistry,
    private readonly retryJobsService: RetryJobsService,
    private readonly monitoring: QueueMonitoringService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('WorkerManagerService');
  }

  async onModuleInit(): Promise<void> {
    await this.queueManager.declare({ name: JOBS_QUEUE_NAME, routingKey: JOBS_ROUTING_KEY });

    const handler: IConsumerHandler<JobPayload> = {
      handle: async (message: QueueMessage<JobPayload>) => this.process(message.payload),
    };

    await this.consumerService.consume(JOBS_QUEUE_NAME, handler, { prefetch: 10 });
  }

  private async process(payload: JobPayload): Promise<void> {
    const jobHandler = this.jobRegistry.get(payload.name);

    if (!jobHandler) {
      this.logger.error(`No handler registered for job "${payload.name}"`);
      this.monitoring.recordFailed();
      return;
    }

    try {
      await jobHandler.process(payload);
      this.monitoring.recordProcessed();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Job "${payload.name}" (${payload.jobId}) failed: ${message}`);

      if (this.retryJobsService.shouldRetry(payload)) {
        await this.retryJobsService.retry(payload);
      } else {
        this.logger.error(`Job "${payload.name}" (${payload.jobId}) exhausted retries`);
        this.monitoring.recordFailed();
      }
    }
  }
}
