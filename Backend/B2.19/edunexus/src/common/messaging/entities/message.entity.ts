import { BaseCommEntity } from './base-comm-entity.interface';
import { MessageType } from '../enums/message-type.enum';

export interface MessageEntity extends BaseCommEntity {
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  replyToMessageId: string | null;
  forwardedFromMessageId: string | null;
  isEdited: boolean;
  editedAt: Date | null;
  isDeleted: boolean;
}
