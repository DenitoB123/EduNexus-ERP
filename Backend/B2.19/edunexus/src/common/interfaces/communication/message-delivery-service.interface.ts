import { MessageDeliveryReceiptEntity } from '../../messaging/entities/message-delivery-receipt.entity';

export interface DeliveryStatsSummary {
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  totalRecipients: number;
}

export interface IMessageDeliveryService {
  initializeReceipts(messageId: string, participantIds: string[], tenantId: string): Promise<void>;

  markSent(messageId: string, participantId: string, tenantId: string): Promise<MessageDeliveryReceiptEntity>;

  markDelivered(messageId: string, participantId: string, tenantId: string): Promise<MessageDeliveryReceiptEntity>;

  markRead(messageId: string, participantId: string, tenantId: string): Promise<MessageDeliveryReceiptEntity>;

  markFailed(
    messageId: string,
    participantId: string,
    tenantId: string,
    reason: string,
  ): Promise<MessageDeliveryReceiptEntity>;

  retryFailedDeliveries(tenantId: string, maxAttempts?: number): Promise<number>;

  getDeliveryStats(messageId: string, tenantId: string): Promise<DeliveryStatsSummary>;
}
