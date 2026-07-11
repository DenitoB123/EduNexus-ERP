import { Injectable } from '@nestjs/common';
import { ModerationFlagRepository } from '../messaging/repositories/moderation-flag.repository';
import { ConversationRepository } from '../messaging/repositories/conversation.repository';
import { ConversationParticipantRepository } from '../messaging/repositories/conversation-participant.repository';
import { ConversationEntity } from '../messaging/entities/conversation.entity';
import { ModerationFlagEntity } from '../messaging/entities/moderation-flag.entity';
import { ModerationStatus } from '../messaging/enums/moderation.enum';
import { FlagContentInput } from '../messaging/dto/flag-content.dto';
import { ContentFlaggedEvent } from '../messaging/events/content-flagged.event';
import { ConversationLockedEvent } from '../messaging/events/conversation-locked.event';
import { EventBus } from '../../infrastructure/events/event-bus.service';
import { MessageService } from '../messaging/message.service';
import { AppLoggerService } from '../logger/app-logger.service';
import { BusinessException } from '../exceptions/business.exception';
import { IModerationService } from '../interfaces/communication/moderation-service.interface';

@Injectable()
export class ModerationService implements IModerationService {
  constructor(
    private readonly flagRepository: ModerationFlagRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly participantRepository: ConversationParticipantRepository,
    private readonly messageService: MessageService,
    private readonly eventBus: EventBus,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('ModerationService');
  }

  async flagContent(input: FlagContentInput, tenantId: string, flaggedBy: string): Promise<ModerationFlagEntity> {
    const flag = await this.flagRepository.create(
      {
        targetType: input.targetType,
        targetId: input.targetId,
        flaggedBy,
        reason: input.reason,
        status: ModerationStatus.PENDING,
        reviewedBy: null,
        reviewedAt: null,
        resolutionNote: null,
      },
      tenantId,
      flaggedBy,
    );

    await this.eventBus.emit(new ContentFlaggedEvent(flag.id, input.targetType, input.targetId, flaggedBy, tenantId));
    this.logger.warn(`Content flagged: ${input.targetType} "${input.targetId}" by "${flaggedBy}" — "${input.reason}"`);

    return flag;
  }

  async reviewFlag(
    flagId: string,
    tenantId: string,
    reviewedBy: string,
    status: ModerationStatus,
    resolutionNote?: string,
  ): Promise<ModerationFlagEntity> {
    if (status === ModerationStatus.PENDING) {
      throw new BusinessException('A flag cannot be reviewed back into PENDING status');
    }

    return this.flagRepository.update(
      flagId,
      { status, reviewedBy, reviewedAt: new Date(), resolutionNote: resolutionNote ?? null },
      tenantId,
      reviewedBy,
    );
  }

  async muteParticipant(
    conversationId: string,
    participantId: string,
    tenantId: string,
    actorId: string,
    mutedUntil?: Date,
  ): Promise<void> {
    const participant = await this.participantRepository.findByConversationAndParticipant(
      conversationId,
      participantId,
      tenantId,
    );
    if (!participant) {
      throw new BusinessException(`"${participantId}" is not a participant of conversation "${conversationId}"`);
    }

    await this.participantRepository.update(
      participant.id,
      { isMuted: true, mutedUntil: mutedUntil ?? null },
      tenantId,
      actorId,
    );
  }

  async lockConversation(
    conversationId: string,
    tenantId: string,
    actorId: string,
    reason?: string,
  ): Promise<ConversationEntity> {
    const locked = await this.conversationRepository.update(
      conversationId,
      { isLocked: true, lockedReason: reason ?? null },
      tenantId,
      actorId,
    );

    await this.eventBus.emit(new ConversationLockedEvent(conversationId, actorId, reason, tenantId));
    return locked;
  }

  async unlockConversation(conversationId: string, tenantId: string, actorId: string): Promise<ConversationEntity> {
    return this.conversationRepository.update(conversationId, { isLocked: false, lockedReason: null }, tenantId, actorId);
  }

  async removeMessage(messageId: string, tenantId: string, actorId: string): Promise<void> {
    // Delegates to IMessageService — moderation is an authorized entry point into the same deletion operation, not a second implementation of it.
    await this.messageService.deleteMessage(messageId, tenantId, actorId);
  }
}
