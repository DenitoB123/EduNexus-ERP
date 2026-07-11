import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { WEBHOOKS_QUEUE_NAME, WEBHOOK_JOB_NAMES, WEBHOOK_SIGNATURE_HEADER, WEBHOOK_EVENT_HEADER } from '../webhooks.constants';
import { WebhooksService } from '../webhooks.service';

/**
 * Performs the actual outbound HTTP POST for a queued webhook delivery.
 * Retries are handled by Bull (attempts/backoff set when the job was
 * enqueued in WebhooksService.fanOut) — this processor only needs to throw
 * on failure for Bull to reschedule it, and record the outcome either way.
 */
@Processor(WEBHOOKS_QUEUE_NAME)
export class WebhookDeliveryProcessor {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooksService: WebhooksService,
  ) {}

  @Process(WEBHOOK_JOB_NAMES.DELIVER)
  async handleDelivery(job: Job<{ deliveryId: string }>): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: job.data.deliveryId },
      include: { subscription: true },
    });
    if (!delivery || !delivery.subscription) return;

    const rawBody = JSON.stringify(delivery.payload);
    const signature = this.webhooksService.signPayload(delivery.subscription.secret, rawBody);

    try {
      const response = await fetch(delivery.subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [WEBHOOK_SIGNATURE_HEADER]: signature,
          [WEBHOOK_EVENT_HEADER]: delivery.eventName,
        },
        body: rawBody,
      });

      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: response.ok ? 'SUCCESS' : 'RETRYING',
          attempt: { increment: 1 },
          responseStatus: response.status,
          lastAttemptAt: new Date(),
        },
      });

      if (!response.ok) {
        throw new Error(`Webhook endpoint responded with status ${response.status}`);
      }
    } catch (error) {
      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: job.attemptsMade + 1 >= job.opts.attempts! ? 'FAILED' : 'RETRYING',
          attempt: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });
      throw error;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error): void {
    this.logger.warn(`Webhook delivery job ${job.id} failed: ${error.message}`);
  }
}
