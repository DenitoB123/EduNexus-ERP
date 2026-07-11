import { ConversationEntity } from '../../messaging/entities/conversation.entity';
import { ModerationFlagEntity } from '../../messaging/entities/moderation-flag.entity';
import { ModerationStatus } from '../../messaging/enums/moderation.enum';
import { FlagContentInput } from '../../messaging/dto/flag-content.dto';

export interface IModerationService {
  flagContent(input: FlagContentInput, tenantId: string, flaggedBy: string): Promise<ModerationFlagEntity>;

  reviewFlag(
    flagId: string,
    tenantId: string,
    reviewedBy: string,
    status: ModerationStatus,
    resolutionNote?: string,
  ): Promise<ModerationFlagEntity>;

  muteParticipant(
    conversationId: string,
    participantId: string,
    tenantId: string,
    actorId: string,
    mutedUntil?: Date,
  ): Promise<void>;

  lockConversation(
    conversationId: string,
    tenantId: string,
    actorId: string,
    reason?: string,
  ): Promise<ConversationEntity>;

  unlockConversation(conversationId: string, tenantId: string, actorId: string): Promise<ConversationEntity>;

  /** Delegates to `IMessageService.deleteMessage` — moderation doesn't duplicate deletion logic, it's just an authorized entry point into the same operation with a moderation-flag audit trail. */
  removeMessage(messageId: string, tenantId: string, actorId: string): Promise<void>;
}
