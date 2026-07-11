import { DomainEvent } from '../../base/domain-event';

export class ConversationLockedEvent extends DomainEvent {
  constructor(
    public readonly conversationId: string,
    public readonly lockedBy: string,
    public readonly reason: string | undefined,
    tenantId: string,
  ) {
    super('messaging.conversation.locked');
    this.tenantId = tenantId;
  }
}
