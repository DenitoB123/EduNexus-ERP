import { DomainEvent } from '../../base/domain-event';

export class ParticipantAddedEvent extends DomainEvent {
  constructor(
    public readonly conversationId: string,
    public readonly participantId: string,
    public readonly addedBy: string,
    tenantId: string,
  ) {
    super('messaging.conversation.participant-added');
    this.tenantId = tenantId;
  }
}
