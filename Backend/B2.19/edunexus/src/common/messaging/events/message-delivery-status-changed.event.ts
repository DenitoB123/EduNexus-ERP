import { DomainEvent } from '../../base/domain-event';
import { DeliveryStatus } from '../enums/delivery-status.enum';

export class MessageDeliveryStatusChangedEvent extends DomainEvent {
  constructor(
    public readonly messageId: string,
    public readonly participantId: string,
    public readonly status: DeliveryStatus,
    tenantId: string,
  ) {
    super('messaging.message.delivery-status-changed');
    this.tenantId = tenantId;
  }
}
