import { QueryOptions, PaginatedResult } from '../../../database/interfaces/base-model.interface';
import { MessageEntity } from '../../messaging/entities/message.entity';
import { MessageReactionEntity } from '../../messaging/entities/message-reaction.entity';
import { SendMessageInput } from '../../messaging/dto/send-message.dto';

export interface IMessageService {
  sendMessage(input: SendMessageInput, tenantId: string, senderId: string): Promise<MessageEntity>;

  editMessage(messageId: string, newContent: string, tenantId: string, actorId: string): Promise<MessageEntity>;

  deleteMessage(messageId: string, tenantId: string, actorId: string): Promise<void>;

  forwardMessage(
    messageId: string,
    toConversationId: string,
    tenantId: string,
    actorId: string,
  ): Promise<MessageEntity>;

  reactToMessage(
    messageId: string,
    participantId: string,
    emoji: string,
    tenantId: string,
  ): Promise<MessageReactionEntity>;

  removeReaction(messageId: string, participantId: string, emoji: string, tenantId: string): Promise<void>;

  listMessages(
    conversationId: string,
    tenantId: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<MessageEntity>>;
}
