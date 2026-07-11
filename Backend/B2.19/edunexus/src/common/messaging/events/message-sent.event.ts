import { DomainEvent } from '../../base/domain-event';

export class MessageSentEvent extends DomainEvent {
  constructor(
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly senderId: string,
    tenantId: string,
  ) {
    super('messaging.message.sent');
    this.tenantId = tenantId;
  }
}
