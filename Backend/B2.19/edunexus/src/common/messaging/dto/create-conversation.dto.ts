import { ConversationType } from '../enums/conversation-type.enum';

export interface CreateConversationInput {
  type: ConversationType;
  title?: string;
  participantIds: string[];
  linkedEntityType?: string;
  linkedEntityId?: string;
}
