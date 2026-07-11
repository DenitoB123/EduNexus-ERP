import { BaseCommEntity } from './base-comm-entity.interface';

export interface MessageMentionEntity extends BaseCommEntity {
  messageId: string;
  mentionedParticipantId: string;
}
