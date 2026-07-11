import { BaseCommEntity } from './base-comm-entity.interface';
import { ConversationType } from '../enums/conversation-type.enum';

export interface ConversationEntity extends BaseCommEntity {
  type: ConversationType;
  title: string | null;
  isLocked: boolean;
  lockedReason: string | null;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  lastMessageAt: Date | null;
}
