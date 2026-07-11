import { MessageType } from '../enums/message-type.enum';

export interface SendMessageAttachmentInput {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind?: string;
  durationSeconds?: number;
}

export interface SendMessageInput {
  conversationId: string;
  type?: MessageType;
  content: string;
  replyToMessageId?: string;
  attachments?: SendMessageAttachmentInput[];
  /**
   * Explicit participant IDs to record as mentioned in this message.
   * Resolving `@handle` text in `content` into participant IDs is the
   * caller's job (see `MentionResolutionUtil`) — this service has no
   * directory to resolve handles against on its own (no canonical
   * User model in this branch yet).
   */
  mentionedParticipantIds?: string[];
}
