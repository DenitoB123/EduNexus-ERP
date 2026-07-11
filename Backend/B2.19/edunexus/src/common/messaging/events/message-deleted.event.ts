import { DomainEvent } from '../../base/domain-event';

export class MessageDeletedEvent extends DomainEvent {
  constructor(
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly deletedBy: string,
    tenantId: string,
  ) {
    super('messaging.message.deleted');
    this.tenantId = tenantId;
  }
}
