import { Injectable } from '@nestjs/common';
import { JobHandlerBase } from '../../../infrastructure/jobs/job-handler.base';
import { JobPayload } from '../../../infrastructure/interfaces/job.interface';
import { MessageDeliveryService } from '../message-delivery.service';
import { AppLoggerService } from '../../logger/app-logger.service';

export interface MessageDeliveryRetryPayload {
  tenantId: string;
}

export const MESSAGE_DELIVERY_RETRY_JOB = 'messaging.message.retry-failed-deliveries';

/**
 * Requeues FAILED delivery receipts (status -> QUEUED) so they get
 * picked up by a fresh `MessageNotificationFanoutJob`-style dispatch
 * attempt. Intended to be enqueued periodically (e.g. by a cron-style
 * caller in a future scheduling milestone) or on-demand — it doesn't
 * schedule itself, it just does the requeue work when run.
 */
@Injectable()
export class MessageDeliveryRetryJob extends JobHandlerBase<MessageDeliveryRetryPayload> {
  readonly name = MESSAGE_DELIVERY_RETRY_JOB;

  constructor(
    private readonly deliveryService: MessageDeliveryService,
    private readonly logger: AppLoggerService,
  ) {
    super();
    this.logger.setContext('MessageDeliveryRetryJob');
  }

  async process(payload: JobPayload<MessageDeliveryRetryPayload>): Promise<void> {
    const requeued = await this.deliveryService.retryFailedDeliveries(payload.data.tenantId);
    this.logger.log(`Requeued ${requeued} failed delivery receipt(s) for tenant "${payload.data.tenantId}"`);
  }
}
