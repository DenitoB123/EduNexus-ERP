import { Injectable } from '@nestjs/common';
import { MessageRepository } from './repositories/message.repository';
import { MessageAttachmentRepository } from './repositories/message-attachment.repository';
import { MessageReactionRepository } from './repositories/message-reaction.repository';
import { MessageMentionRepository } from './repositories/message-mention.repository';
import { ConversationRepository } from './repositories/conversation.repository';
import { ConversationParticipantRepository } from './repositories/conversation-participant.repository';
import { MessageEntity } from './entities/message.entity';
import { MessageReactionEntity } from './entities/message-reaction.entity';
import { MessageType } from './enums/message-type.enum';
import { SendMessageInput } from './dto/send-message.dto';
import { MessageSentEvent } from './events/message-sent.event';
import { MessageDeletedEvent } from './events/message-deleted.event';
import { MessageDeliveryService } from '../delivery/message-delivery.service';
import {
  MESSAGE_NOTIFICATION_FANOUT_JOB,
  MessageNotificationFanoutPayload,
} from '../delivery/jobs/message-notification-fanout.job';
import { EventBus } from '../../infrastructure/events/event-bus.service';
import { JobQueueService } from '../../infrastructure/jobs/job-queue.service';
import { InputSanitizerService } from '../../security/sanitizers/input-sanitizer.service';
import { FileSecurityService } from '../../security/helpers/file-security.service';
import { RichContentUtil } from '../utils/communication/rich-content.util';
import { AttachmentValidationUtil } from '../utils/communication/attachment-validation.util';
import { AppLoggerService } from '../logger/app-logger.service';
import { BusinessException } from '../exceptions/business.exception';
import { ValidationException } from '../exceptions/validation.exception';
import { QueryOptions, PaginatedResult } from '../../database/interfaces/base-model.interface';
import { IMessageService } from '../interfaces/communication/message-service.interface';

@Injectable()
export class MessageService implements IMessageService {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly attachmentRepository: MessageAttachmentRepository,
    private readonly reactionRepository: MessageReactionRepository,
    private readonly mentionRepository: MessageMentionRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly participantRepository: ConversationParticipantRepository,
    private readonly deliveryService: MessageDeliveryService,
    private readonly eventBus: EventBus,
    private readonly jobQueue: JobQueueService,
    private readonly sanitizer: InputSanitizerService,
    private readonly fileSecurity: FileSecurityService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('MessageService');
  }

  async sendMessage(input: SendMessageInput, tenantId: string, senderId: string): Promise<MessageEntity> {
    const conversation = await this.conversationRepository.findById(input.conversationId, tenantId);
    if (!conversation) {
      throw new BusinessException(`Conversation "${input.conversationId}" was not found`);
    }
    if (conversation.isLocked) {
      throw new BusinessException(`Conversation "${input.conversationId}" is locked and cannot receive new messages`);
    }

    const senderMembership = await this.participantRepository.findByConversationAndParticipant(
      input.conversationId,
      senderId,
      tenantId,
    );
    if (!senderMembership || senderMembership.leftAt) {
      throw new BusinessException(`"${senderId}" is not an active participant of conversation "${input.conversationId}"`);
    }

    const type = input.type ?? MessageType.TEXT;
    const sanitizedContent = RichContentUtil.sanitize(input.content, type, this.sanitizer);

    if (input.attachments?.length) {
      const validation = AttachmentValidationUtil.validate(input.attachments, this.fileSecurity);
      if (!validation.valid) {
        throw new ValidationException('One or more attachments failed validation', validation.errors);
      }
    }

    const message = await this.messageRepository.create(
      {
        conversationId: input.conversationId,
        senderId,
        type,
        content: sanitizedContent,
        replyToMessageId: input.replyToMessageId ?? null,
        forwardedFromMessageId: null,
        isEdited: false,
        editedAt: null,
        isDeleted: false,
      },
      tenantId,
      senderId,
    );

    if (input.attachments?.length) {
      await this.attachmentRepository.batchCreate(
        input.attachments.map((attachment) => ({
          messageId: message.id,
          storageKey: attachment.storageKey,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          kind: attachment.kind ?? 'FILE',
          durationSeconds: attachment.durationSeconds ?? null,
        })),
        tenantId,
        senderId,
      );
    }

    if (input.mentionedParticipantIds?.length) {
      await this.mentionRepository.batchCreate(
        Array.from(new Set(input.mentionedParticipantIds)).map((mentionedParticipantId) => ({
          messageId: message.id,
          mentionedParticipantId,
        })),
        tenantId,
        senderId,
      );
    }

    const participants = await this.participantRepository.listByConversation(input.conversationId, tenantId);
    const recipientIds = participants.filter((p) => p.participantId !== senderId).map((p) => p.participantId);

    await this.deliveryService.initializeReceipts(message.id, recipientIds, tenantId);
    await this.conversationRepository.touchLastMessageAt(input.conversationId, tenantId, message.createdAt);
    await this.eventBus.emit(new MessageSentEvent(message.id, input.conversationId, senderId, tenantId));

    const fanoutPayload: MessageNotificationFanoutPayload = {
      messageId: message.id,
      conversationId: input.conversationId,
      senderId,
      tenantId,
    };
    await this.jobQueue.enqueue(MESSAGE_NOTIFICATION_FANOUT_JOB, fanoutPayload);

    return message;
  }

  async editMessage(messageId: string, newContent: string, tenantId: string, actorId: string): Promise<MessageEntity> {
    const message = await this.getMessageOrThrow(messageId, tenantId);

    if (message.senderId !== actorId) {
      throw new BusinessException('Only the original sender may edit a message');
    }
    if (message.isDeleted) {
      throw new BusinessException('A deleted message cannot be edited');
    }

    const sanitizedContent = RichContentUtil.sanitize(newContent, message.type, this.sanitizer);

    return this.messageRepository.update(
      messageId,
      { content: sanitizedContent, isEdited: true, editedAt: new Date() },
      tenantId,
      actorId,
    );
  }

  async deleteMessage(messageId: string, tenantId: string, actorId: string): Promise<void> {
    const message = await this.getMessageOrThrow(messageId, tenantId);

    await this.messageRepository.update(messageId, { isDeleted: true }, tenantId, actorId);
    await this.eventBus.emit(new MessageDeletedEvent(messageId, message.conversationId, actorId, tenantId));
  }

  async forwardMessage(
    messageId: string,
    toConversationId: string,
    tenantId: string,
    actorId: string,
  ): Promise<MessageEntity> {
    const original = await this.getMessageOrThrow(messageId, tenantId);
    const [attachments] = await Promise.all([this.attachmentRepository.listByMessage(messageId, tenantId)]);

    const forwarded = await this.sendMessage(
      {
        conversationId: toConversationId,
        type: original.type,
        content: original.content,
        attachments: attachments.map((a) => ({
          storageKey: a.storageKey,
          fileName: a.fileName,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          kind: a.kind,
          durationSeconds: a.durationSeconds ?? undefined,
        })),
      },
      tenantId,
      actorId,
    );

    return this.messageRepository.update(forwarded.id, { forwardedFromMessageId: original.id }, tenantId, actorId);
  }

  async reactToMessage(
    messageId: string,
    participantId: string,
    emoji: string,
    tenantId: string,
  ): Promise<MessageReactionEntity> {
    await this.getMessageOrThrow(messageId, tenantId);

    const existing = await this.reactionRepository.findOneReaction(messageId, participantId, emoji, tenantId);
    if (existing) return existing;

    return this.reactionRepository.create({ messageId, participantId, emoji }, tenantId, participantId);
  }

  async removeReaction(messageId: string, participantId: string, emoji: string, tenantId: string): Promise<void> {
    const existing = await this.reactionRepository.findOneReaction(messageId, participantId, emoji, tenantId);
    if (!existing) return;

    await this.reactionRepository.softDelete(existing.id, tenantId, participantId);
  }

  async listMessages(
    conversationId: string,
    tenantId: string,
    options: QueryOptions = {},
  ): Promise<PaginatedResult<MessageEntity>> {
    return this.messageRepository.listByConversation(conversationId, tenantId, options);
  }

  private async getMessageOrThrow(messageId: string, tenantId: string): Promise<MessageEntity> {
    const message = await this.messageRepository.findById(messageId, tenantId);
    if (!message) {
      throw new BusinessException(`Message "${messageId}" was not found`);
    }
    return message;
  }
}
