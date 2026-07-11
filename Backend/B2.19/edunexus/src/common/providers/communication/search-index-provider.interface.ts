import { MessageEntity } from '../../messaging/entities/message.entity';
import { ConversationEntity } from '../../messaging/entities/conversation.entity';

/**
 * Extension point for the Search Framework integration the spec
 * calls for ("Message Search / Conversation Search / Attachment
 * Search / Participant Search... integrate through interfaces with
 * the Search Framework"). No standalone Search Framework/indexing
 * service exists in this codebase yet — `database/helpers/search.helper.ts`
 * and `common/search` are query-building utilities for Prisma
 * `WHERE` clauses (already used directly by
 * `MessageRepository`/`ConversationRepository`'s
 * `allowedSearchFields` for in-database text search), not an external
 * index. When a real Search Framework milestone lands, register an
 * `ISearchIndexProvider` under `COMMUNICATION_SEARCH_INDEX_PROVIDER`
 * and `MessageService`/`ConversationService` will call it (no-op
 * today) to keep an external index in sync on every write.
 */
export interface ISearchIndexProvider {
  indexMessage(message: MessageEntity): Promise<void>;
  removeMessage(messageId: string, tenantId: string): Promise<void>;
  indexConversation(conversation: ConversationEntity): Promise<void>;
}

export const COMMUNICATION_SEARCH_INDEX_PROVIDER = 'COMMUNICATION_SEARCH_INDEX_PROVIDER';
