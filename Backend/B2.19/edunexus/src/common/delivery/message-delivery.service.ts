import { Injectable } from '@nestjs/common';
import { MessageDeliveryReceiptRepository } from '../messaging/repositories/message-delivery-receipt.repository';
import { MessageDeliveryReceiptEntity } from '../messaging/entities/message-delivery-receipt.entity';
import { DeliveryStatus } from '../messaging/enums/delivery-status.enum';
import { MessageDeliveryStatusChangedEvent } from '../messaging/events/message-delivery-status-changed.event';
import { EventBus } from '../../infrastructure/events/event-bus.service';
import { AppLoggerService } from '../logger/app-logger.service';
import { BusinessException } from '../exceptions/business.exception';
import { DeliveryTrackingUtil } from '../utils/communication/delivery-tracking.util';
import {
  DeliveryStatsSummary,
  IMessageDeliveryService,
} from '../interfaces/communication/message-delivery-service.interface';

const DEFAULT_MAX_RETRY_ATTEMPTS = 5;

@Injectable()
export class MessageDeliveryService implements IMessageDeliveryService {
  constructor(
    private readonly receiptRepository: MessageDeliveryReceiptRepository,
    private readonly eventBus: EventBus,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('MessageDeliveryService');
  }

  async initializeReceipts(messageId: string, participantIds: string[], tenantId: string): Promise<void> {
    if (participantIds.length === 0) return;

    await this.receiptRepository.batchCreate(
      participantIds.map((participantId) => ({
        messageId,
        participantId,
        status: DeliveryStatus.QUEUED,
        statusAt: new Date(),
        retryCount: 0,
        failureReason: null,
      })),
      tenantId,
    );
  }

  async markSent(messageId: string, participantId: string, tenantId: string): Promise<MessageDeliveryReceiptEntity> {
    return this.transitionStatus(messageId, participantId, tenantId, DeliveryStatus.SENT);
  }

  async markDelivered(
    messageId: string,
    participantId: string,
    tenantId: string,
  ): Promise<MessageDeliveryReceiptEntity> {
    return this.transitionStatus(messageId, participantId, tenantId, DeliveryStatus.DELIVERED);
  }

  async markRead(messageId: string, participantId: string, tenantId: string): Promise<MessageDeliveryReceiptEntity> {
    return this.transitionStatus(messageId, participantId, tenantId, DeliveryStatus.READ);
  }

  async markFailed(
    messageId: string,
    participantId: string,
    tenantId: string,
    reason: string,
  ): Promise<MessageDeliveryReceiptEntity> {
    const receipt = await this.getReceiptOrThrow(messageId, participantId, tenantId);

    const updated = await this.receiptRepository.update(
      receipt.id,
      {
        status: DeliveryStatus.FAILED,
        statusAt: new Date(),
        failureReason: reason,
        retryCount: receipt.retryCount + 1,
      },
      tenantId,
    );

    await this.eventBus.emit(
      new MessageDeliveryStatusChangedEvent(messageId, participantId, DeliveryStatus.FAILED, tenantId),
    );
    return updated;
  }

  async retryFailedDeliveries(tenantId: string, maxAttempts = DEFAULT_MAX_RETRY_ATTEMPTS): Promise<number> {
    const failed = await this.receiptRepository.listFailedForRetry(tenantId, maxAttempts);

    for (const receipt of failed) {
      await this.receiptRepository.update(
        receipt.id,
        { status: DeliveryStatus.QUEUED, statusAt: new Date() },
        tenantId,
      );
    }

    this.logger.log(`Requeued ${failed.length} failed delivery receipt(s) for tenant "${tenantId}"`);
    return failed.length;
  }

  async getDeliveryStats(messageId: string, tenantId: string): Promise<DeliveryStatsSummary> {
    const receipts = await this.receiptRepository.listByMessage(messageId, tenantId);
    return DeliveryTrackingUtil.summarize(receipts);
  }

  private async transitionStatus(
    messageId: string,
    participantId: string,
    tenantId: string,
    status: DeliveryStatus,
  ): Promise<MessageDeliveryReceiptEntity> {
    const receipt = await this.getReceiptOrThrow(messageId, participantId, tenantId);

    const updated = await this.receiptRepository.update(receipt.id, { status, statusAt: new Date() }, tenantId);
    await this.eventBus.emit(new MessageDeliveryStatusChangedEvent(messageId, participantId, status, tenantId));
    return updated;
  }

  private async getReceiptOrThrow(
    messageId: string,
    participantId: string,
    tenantId: string,
  ): Promise<MessageDeliveryReceiptEntity> {
    const receipt = await this.receiptRepository.findForMessageAndParticipant(messageId, participantId, tenantId);
    if (!receipt) {
      throw new BusinessException(
        `No delivery receipt exists for message "${messageId}" / participant "${participantId}"`,
      );
    }
    return receipt;
  }
}
