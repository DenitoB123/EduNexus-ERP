import { Injectable } from '@nestjs/common';
import { CollaborationActivityRepository } from '../messaging/repositories/collaboration-activity.repository';
import { ConversationRepository } from '../messaging/repositories/conversation.repository';
import { MessageAttachmentRepository } from '../messaging/repositories/message-attachment.repository';
import { MessageRepository } from '../messaging/repositories/message.repository';
import { ConversationService } from '../conversations/conversation.service';
import { CollaborationActivityEntity } from '../messaging/entities/collaboration-activity.entity';
import { ConversationEntity } from '../messaging/entities/conversation.entity';
import { MessageAttachmentEntity } from '../messaging/entities/message-attachment.entity';
import { CollaborationActivityType } from '../messaging/enums/activity-type.enum';
import { ConversationType } from '../messaging/enums/conversation-type.enum';

/**
 * Backs the spec's "Shared Discussions / Shared Attachments / Shared
 * Links / Activity Feeds / Collaboration Metadata" requirements on
 * top of the same Conversation/Message/MessageAttachment tables
 * everything else in this module uses — no separate
 * "collaboration" data model was introduced:
 *
 * - Shared Discussion  = a Conversation with `linkedEntityType`/
 *   `linkedEntityId` pointing at some other business entity (a
 *   Student record, a Course, etc. — entities that don't exist in
 *   this branch yet, hence the loosely-typed string pair).
 * - Shared Attachments/Links = the linked discussion's messages'
 *   `MessageAttachment` rows / message `content` (link extraction
 *   from `content` is left to the API layer / a future Search
 *   Framework, not duplicated here).
 * - Activity Feed = `CollaborationActivity`, populated automatically
 *   by `CollaborationActivityListener` reacting to domain events
 *   (not by every service manually calling `recordActivity`).
 */
@Injectable()
export class CollaborationService {
  constructor(
    private readonly activityRepository: CollaborationActivityRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly conversationService: ConversationService,
    private readonly attachmentRepository: MessageAttachmentRepository,
    private readonly messageRepository: MessageRepository,
  ) {}

  async recordActivity(
    activityType: CollaborationActivityType,
    actorId: string,
    entityType: string,
    entityId: string,
    tenantId: string,
    metadata?: Record<string, unknown>,
  ): Promise<CollaborationActivityEntity> {
    return this.activityRepository.create(
      { activityType, actorId, entityType, entityId, metadata: metadata ?? null },
      tenantId,
      actorId,
    );
  }

  async getActivityFeed(entityType: string, entityId: string, tenantId: string): Promise<CollaborationActivityEntity[]> {
    return this.activityRepository.listForEntity(entityType, entityId, tenantId);
  }

  async getOrCreateSharedDiscussion(
    entityType: string,
    entityId: string,
    tenantId: string,
    actorId: string,
    initialParticipantIds: string[],
  ): Promise<ConversationEntity> {
    const existing = await this.findLinkedConversation(entityType, entityId, tenantId);
    if (existing) return existing;

    return this.conversationService.createConversation(
      {
        type: ConversationType.GROUP,
        title: `${entityType}:${entityId}`,
        participantIds: initialParticipantIds,
        linkedEntityType: entityType,
        linkedEntityId: entityId,
      },
      tenantId,
      actorId,
    );
  }

  async listSharedAttachments(entityType: string, entityId: string, tenantId: string): Promise<MessageAttachmentEntity[]> {
    const conversation = await this.findLinkedConversation(entityType, entityId, tenantId);
    if (!conversation) return [];

    const messages = await this.messageRepository.listByConversation(conversation.id, tenantId, {
      pagination: { page: 1, pageSize: 200 },
    });

    const attachmentLists = await Promise.all(
      messages.items.map((message) => this.attachmentRepository.listByMessage(message.id, tenantId)),
    );

    return attachmentLists.flat();
  }

  private async findLinkedConversation(
    entityType: string,
    entityId: string,
    tenantId: string,
  ): Promise<ConversationEntity | null> {
    return this.conversationRepository.findByLinkedEntity(entityType, entityId, tenantId);
  }
}
