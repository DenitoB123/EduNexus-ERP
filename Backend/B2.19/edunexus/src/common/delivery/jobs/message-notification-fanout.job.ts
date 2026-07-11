import { Inject, Injectable } from '@nestjs/common';
import { JobHandlerBase } from '../../../infrastructure/jobs/job-handler.base';
import { JobPayload } from '../../../infrastructure/interfaces/job.interface';
import { ConversationParticipantRepository } from '../../messaging/repositories/conversation-participant.repository';
import { MessageRepository } from '../../messaging/repositories/message.repository';
import { MessageDeliveryService } from '../message-delivery.service';
import { MessageFormattingUtil } from '../../utils/communication/message-formatting.util';
import {
  COMMUNICATION_NOTIFICATION_DISPATCHER,
  INotificationDispatcher,
} from '../../providers/communication/notification-dispatcher.interface';
import { AppLoggerService } from '../../logger/app-logger.service';

export interface MessageNotificationFanoutPayload {
  messageId: string;
  conversationId: string;
  senderId: string;
  tenantId: string;
}

export const MESSAGE_NOTIFICATION_FANOUT_JOB = 'messaging.message.notify-participants';

/**
 * Runs after `MessageService.sendMessage()` enqueues it — fans a push
 * notification out to every non-muted participant other than the
 * sender, and updates each one's `MessageDeliveryReceipt` from QUEUED
 * to SENT/FAILED accordingly. Deliberately a background job (queued
 * via the existing `JobQueueService`, infrastructure/jobs, B1.x)
 * rather than inline in the request path — fan-out to a large group/
 * institution conversation shouldn't make the sender wait on N push
 * calls.
 */
@Injectable()
export class MessageNotificationFanoutJob extends JobHandlerBase<MessageNotificationFanoutPayload> {
  readonly name = MESSAGE_NOTIFICATION_FANOUT_JOB;

  constructor(
    private readonly participantRepository: ConversationParticipantRepository,
    private readonly messageRepository: MessageRepository,
    private readonly deliveryService: MessageDeliveryService,
    @Inject(COMMUNICATION_NOTIFICATION_DISPATCHER)
    private readonly notificationDispatcher: INotificationDispatcher,
    private readonly logger: AppLoggerService,
  ) {
    super();
    this.logger.setContext('MessageNotificationFanoutJob');
  }

  async process(payload: JobPayload<MessageNotificationFanoutPayload>): Promise<void> {
    const { messageId, conversationId, senderId, tenantId } = payload.data;

    const [message, participants] = await Promise.all([
      this.messageRepository.findById(messageId, tenantId),
      this.participantRepository.listByConversation(conversationId, tenantId),
    ]);

    if (!message) {
      this.logger.warn(`MessageNotificationFanoutJob: message "${messageId}" no longer exists, skipping`);
      return;
    }

    const preview = MessageFormattingUtil.toPreview(message.content, message.type);
    const recipients = participants.filter((p) => p.participantId !== senderId && !p.isMuted);

    for (const participant of recipients) {
      try {
        await this.notificationDispatcher.notifyParticipant(participant.participantId, tenantId, {
          title: 'New message',
          body: preview,
          data: { conversationId, messageId },
          channels: ['push'],
        });
        await this.deliveryService.markSent(messageId, participant.participantId, tenantId);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'unknown error';
        await this.deliveryService.markFailed(messageId, participant.participantId, tenantId, reason);
      }
    }
  }
}
