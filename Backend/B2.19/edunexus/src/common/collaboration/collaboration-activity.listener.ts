import { Injectable } from '@nestjs/common';
import { OnEvent } from '../../infrastructure/events/event-subscriber.decorator';
import { CollaborationActivityRepository } from '../messaging/repositories/collaboration-activity.repository';
import { CollaborationActivityType } from '../messaging/enums/activity-type.enum';
import { ConversationCreatedEvent } from '../messaging/events/conversation-created.event';
import { ParticipantAddedEvent } from '../messaging/events/participant-added.event';
import { MessageSentEvent } from '../messaging/events/message-sent.event';
import { AnnouncementPublishedEvent } from '../messaging/events/announcement-published.event';
import { AppLoggerService } from '../logger/app-logger.service';

/**
 * Populates the `CollaborationActivity` feed automatically by
 * subscribing to domain events already emitted elsewhere in this
 * module (`EventBus`/`@OnEvent`, infrastructure/events, B1.3) —
 * services that create conversations/messages/announcements don't
 * separately call `CollaborationService.recordActivity()` themselves,
 * keeping the activity feed a cross-cutting concern rather than
 * scattered write calls across every service.
 */
@Injectable()
export class CollaborationActivityListener {
  constructor(
    private readonly activityRepository: CollaborationActivityRepository,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('CollaborationActivityListener');
  }

  @OnEvent('messaging.conversation.created')
  async onConversationCreated(event: ConversationCreatedEvent): Promise<void> {
    await this.activityRepository.create(
      {
        activityType: CollaborationActivityType.CONVERSATION_CREATED,
        actorId: event.createdBy,
        entityType: 'Conversation',
        entityId: event.conversationId,
        metadata: { type: event.type },
      },
      event.tenantId as string,
      event.createdBy,
    );
  }

  @OnEvent('messaging.conversation.participant-added')
  async onParticipantAdded(event: ParticipantAddedEvent): Promise<void> {
    await this.activityRepository.create(
      {
        activityType: CollaborationActivityType.PARTICIPANT_ADDED,
        actorId: event.addedBy,
        entityType: 'Conversation',
        entityId: event.conversationId,
        metadata: { participantId: event.participantId },
      },
      event.tenantId as string,
      event.addedBy,
    );
  }

  @OnEvent('messaging.message.sent')
  async onMessageSent(event: MessageSentEvent): Promise<void> {
    await this.activityRepository.create(
      {
        activityType: CollaborationActivityType.MESSAGE_POSTED,
        actorId: event.senderId,
        entityType: 'Conversation',
        entityId: event.conversationId,
        metadata: { messageId: event.messageId },
      },
      event.tenantId as string,
      event.senderId,
    );
  }

  @OnEvent('messaging.announcement.published')
  async onAnnouncementPublished(event: AnnouncementPublishedEvent): Promise<void> {
    await this.activityRepository.create(
      {
        activityType: CollaborationActivityType.ANNOUNCEMENT_PUBLISHED,
        actorId: 'system',
        entityType: 'Announcement',
        entityId: event.announcementId,
        metadata: { audienceType: event.audienceType },
      },
      event.tenantId as string,
      'system',
    );
  }
}
