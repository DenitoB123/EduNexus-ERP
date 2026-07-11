import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PublisherService } from '../rabbitmq/publisher.service';
import { AppConfigService } from '../../config/app-config.service';
import { QueueMonitoringService } from './queue-monitoring.service';
import { JOBS_ROUTING_KEY, JOBS_DEFAULT_MAX_ATTEMPTS } from './job.constants';
import { JobPayload } from '../interfaces/job.interface';

@Injectable()
export class JobQueueService {
  constructor(
    private readonly publisherService: PublisherService,
    private readonly configService: AppConfigService,
    private readonly monitoring: QueueMonitoringService,
  ) {}

  async enqueue<T>(name: string, data: T, maxAttempts = JOBS_DEFAULT_MAX_ATTEMPTS): Promise<string> {
    const jobId = randomUUID();
    const payload: JobPayload<T> = { jobId, name, data, attempts: 0, maxAttempts };

    await this.publisherService.publish(
      this.configService.rabbitmq.exchange,
      JOBS_ROUTING_KEY,
      payload,
    );

    this.monitoring.recordEnqueued();
    return jobId;
  }
}
