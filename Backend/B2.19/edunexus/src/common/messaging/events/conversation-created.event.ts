import { DomainEvent } from '../../base/domain-event';
import { ConversationType } from '../enums/conversation-type.enum';

export class ConversationCreatedEvent extends DomainEvent {
  constructor(
    public readonly conversationId: string,
    public readonly type: ConversationType,
    public readonly createdBy: string,
    tenantId: string,
  ) {
    super('messaging.conversation.created');
    this.tenantId = tenantId;
  }
}
