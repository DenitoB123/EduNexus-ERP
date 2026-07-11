import { BaseCommEntity } from './base-comm-entity.interface';
import { DeliveryStatus } from '../enums/delivery-status.enum';

export interface MessageDeliveryReceiptEntity extends BaseCommEntity {
  messageId: string;
  participantId: string;
  status: DeliveryStatus;
  statusAt: Date;
  retryCount: number;
  failureReason: string | null;
}
