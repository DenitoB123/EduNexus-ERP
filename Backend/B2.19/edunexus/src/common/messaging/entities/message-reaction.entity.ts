import { BaseCommEntity } from './base-comm-entity.interface';

export interface MessageReactionEntity extends BaseCommEntity {
  messageId: string;
  participantId: string;
  emoji: string;
}
