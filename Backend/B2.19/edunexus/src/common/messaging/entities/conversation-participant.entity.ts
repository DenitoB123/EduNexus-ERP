import { BaseCommEntity } from './base-comm-entity.interface';
import { ParticipantRole } from '../enums/participant-role.enum';

export interface ConversationParticipantEntity extends BaseCommEntity {
  conversationId: string;
  participantId: string;
  role: ParticipantRole;
  isMuted: boolean;
  mutedUntil: Date | null;
  isPinned: boolean;
  isArchived: boolean;
  lastReadMessageId: string | null;
  lastReadAt: Date | null;
  joinedAt: Date;
  leftAt: Date | null;
}
