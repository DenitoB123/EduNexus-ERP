import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ConfirmChannel } from 'amqplib';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { AppConfigService } from '../../config/app-config.service';
import { QueueMonitoringService } from './queue-monitoring.service';
import { JOBS_DELAY_QUEUE_NAME, JOBS_ROUTING_KEY, JOBS_DEFAULT_MAX_ATTEMPTS } from './job.constants';
import { JobPayload } from '../interfaces/job.interface';

@Injectable()
export class DelayedJobsService {
  private provisioned = false;

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly configService: AppConfigService,
    private readonly monitoring: QueueMonitoringService,
  ) {}

  private async ensureProvisioned(): Promise<void> {
    if (this.provisioned) return;

    const { exchange } = this.configService.rabbitmq;

    await this.rabbitMQService.getChannelWrapper().addSetup(async (channel: ConfirmChannel) => {
      await channel.assertQueue(JOBS_DELAY_QUEUE_NAME, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': exchange,
          'x-dead-letter-routing-key': JOBS_ROUTING_KEY,
        },
      });
    });

    this.provisioned = true;
  }

  async enqueueDelayed<T>(
    name: string,
    data: T,
    delayMs: number,
    maxAttempts = JOBS_DEFAULT_MAX_ATTEMPTS,
  ): Promise<string> {
    const jobId = randomUUID();
    const payload: JobPayload<T> = {
      jobId,
      name,
      data,
      attempts: 0,
      maxAttempts,
      scheduledFor: new Date(Date.now() + delayMs),
    };

    await this.enqueueRaw(payload, delayMs);
    return jobId;
  }

  async enqueueRaw<T>(payload: JobPayload<T>, delayMs: number): Promise<void> {
    await this.ensureProvisioned();

    await this.rabbitMQService
      .getChannelWrapper()
      .sendToQueue(
        JOBS_DELAY_QUEUE_NAME,
        { ...payload, scheduledFor: new Date(Date.now() + delayMs) },
        { expiration: delayMs.toString() },
      );

    this.monitoring.recordEnqueued();
  }
}
