import { QueryOptions, PaginatedResult } from '../../../database/interfaces/base-model.interface';
import { ConversationEntity } from '../../messaging/entities/conversation.entity';
import { ConversationParticipantEntity } from '../../messaging/entities/conversation-participant.entity';
import { ParticipantRole } from '../../messaging/enums/participant-role.enum';
import { CreateConversationInput } from '../../messaging/dto/create-conversation.dto';

export interface IConversationService {
  createConversation(
    input: CreateConversationInput,
    tenantId: string,
    actorId: string,
  ): Promise<ConversationEntity>;

  getConversation(id: string, tenantId: string): Promise<ConversationEntity>;

  listConversationsForParticipant(
    participantId: string,
    tenantId: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<ConversationEntity>>;

  addParticipant(
    conversationId: string,
    participantId: string,
    role: ParticipantRole,
    tenantId: string,
    actorId: string,
  ): Promise<ConversationParticipantEntity>;

  removeParticipant(
    conversationId: string,
    participantId: string,
    tenantId: string,
    actorId: string,
  ): Promise<void>;

  setPinned(conversationId: string, participantId: string, tenantId: string, isPinned: boolean): Promise<void>;

  setArchived(conversationId: string, participantId: string, tenantId: string, isArchived: boolean): Promise<void>;

  setMuted(
    conversationId: string,
    participantId: string,
    tenantId: string,
    isMuted: boolean,
    mutedUntil?: Date,
  ): Promise<void>;
}
