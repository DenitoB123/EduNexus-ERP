import { Injectable } from '@nestjs/common';
import { ConversationRepository } from '../messaging/repositories/conversation.repository';
import { ConversationParticipantRepository } from '../messaging/repositories/conversation-participant.repository';
import { ConversationEntity } from '../messaging/entities/conversation.entity';
import { ConversationParticipantEntity } from '../messaging/entities/conversation-participant.entity';
import { ParticipantRole } from '../messaging/enums/participant-role.enum';
import { CreateConversationInput } from '../messaging/dto/create-conversation.dto';
import { ConversationCreatedEvent } from '../messaging/events/conversation-created.event';
import { ParticipantAddedEvent } from '../messaging/events/participant-added.event';
import { EventBus } from '../../infrastructure/events/event-bus.service';
import { AppLoggerService } from '../logger/app-logger.service';
import { BusinessException } from '../exceptions/business.exception';
import { QueryOptions, PaginatedResult } from '../../database/interfaces/base-model.interface';
import { IConversationService } from '../interfaces/communication/conversation-service.interface';

/**
 * KNOWN LIMITATION (documented, matching the same disclosure pattern
 * as B2.8's `CommandTransactionBehavior`): creating a conversation and
 * adding its initial participants is two sequential writes, not one
 * atomic transaction — B2.2's repositories bind their Prisma delegate
 * at construction with no shared `tx` available here. If the process
 * crashes between the two writes, a conversation can exist with zero
 * participants. Left for a future milestone that addresses the
 * broader transaction-propagation gap already flagged in
 * IMPLEMENTATION_SUMMARY_B2_8.md, rather than reworked ad hoc here.
 */
@Injectable()
export class ConversationService implements IConversationService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly participantRepository: ConversationParticipantRepository,
    private readonly eventBus: EventBus,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('ConversationService');
  }

  async createConversation(
    input: CreateConversationInput,
    tenantId: string,
    actorId: string,
  ): Promise<ConversationEntity> {
    if (input.participantIds.length === 0) {
      throw new BusinessException('A conversation must have at least one participant besides the creator');
    }

    const conversation = await this.conversationRepository.create(
      {
        type: input.type,
        title: input.title ?? null,
        isLocked: false,
        lockedReason: null,
        linkedEntityType: input.linkedEntityType ?? null,
        linkedEntityId: input.linkedEntityId ?? null,
        lastMessageAt: null,
      },
      tenantId,
      actorId,
    );

    const participantIds = Array.from(new Set([actorId, ...input.participantIds]));
    await this.participantRepository.batchCreate(
      participantIds.map((participantId) => ({
        conversationId: conversation.id,
        participantId,
        role: participantId === actorId ? ParticipantRole.OWNER : ParticipantRole.MEMBER,
        isMuted: false,
        mutedUntil: null,
        isPinned: false,
        isArchived: false,
        lastReadMessageId: null,
        lastReadAt: null,
        joinedAt: new Date(),
        leftAt: null,
      })),
      tenantId,
      actorId,
    );

    await this.eventBus.emit(new ConversationCreatedEvent(conversation.id, conversation.type, actorId, tenantId));
    this.logger.log(`Conversation "${conversation.id}" created by "${actorId}" with ${participantIds.length} participant(s)`);

    return conversation;
  }

  async getConversation(id: string, tenantId: string): Promise<ConversationEntity> {
    const conversation = await this.conversationRepository.findById(id, tenantId);
    if (!conversation) {
      throw new BusinessException(`Conversation "${id}" was not found`);
    }
    return conversation;
  }

  async listConversationsForParticipant(
    participantId: string,
    tenantId: string,
    options: QueryOptions = {},
  ): Promise<PaginatedResult<ConversationEntity>> {
    const memberships = await this.participantRepository.listByParticipant(participantId, tenantId);
    const conversationIds = memberships.map((m) => m.conversationId);

    return this.conversationRepository.findByIds(conversationIds, tenantId, options);
  }

  async addParticipant(
    conversationId: string,
    participantId: string,
    role: ParticipantRole,
    tenantId: string,
    actorId: string,
  ): Promise<ConversationParticipantEntity> {
    await this.getConversation(conversationId, tenantId);

    const existing = await this.participantRepository.findByConversationAndParticipant(
      conversationId,
      participantId,
      tenantId,
    );
    if (existing) {
      throw new BusinessException(`"${participantId}" is already a participant of conversation "${conversationId}"`);
    }

    const participant = await this.participantRepository.create(
      {
        conversationId,
        participantId,
        role,
        isMuted: false,
        mutedUntil: null,
        isPinned: false,
        isArchived: false,
        lastReadMessageId: null,
        lastReadAt: null,
        joinedAt: new Date(),
        leftAt: null,
      },
      tenantId,
      actorId,
    );

    await this.eventBus.emit(new ParticipantAddedEvent(conversationId, participantId, actorId, tenantId));
    return participant;
  }

  async removeParticipant(
    conversationId: string,
    participantId: string,
    tenantId: string,
    actorId: string,
  ): Promise<void> {
    const participant = await this.participantRepository.findByConversationAndParticipant(
      conversationId,
      participantId,
      tenantId,
    );
    if (!participant) {
      throw new BusinessException(`"${participantId}" is not a participant of conversation "${conversationId}"`);
    }

    await this.participantRepository.softDelete(participant.id, tenantId, actorId);
  }

  async setPinned(conversationId: string, participantId: string, tenantId: string, isPinned: boolean): Promise<void> {
    await this.updateOwnMembership(conversationId, participantId, tenantId, { isPinned });
  }

  async setArchived(
    conversationId: string,
    participantId: string,
    tenantId: string,
    isArchived: boolean,
  ): Promise<void> {
    await this.updateOwnMembership(conversationId, participantId, tenantId, { isArchived });
  }

  async setMuted(
    conversationId: string,
    participantId: string,
    tenantId: string,
    isMuted: boolean,
    mutedUntil?: Date,
  ): Promise<void> {
    await this.updateOwnMembership(conversationId, participantId, tenantId, {
      isMuted,
      mutedUntil: mutedUntil ?? null,
    });
  }

  private async updateOwnMembership(
    conversationId: string,
    participantId: string,
    tenantId: string,
    patch: Partial<ConversationParticipantEntity>,
  ): Promise<void> {
    const participant = await this.participantRepository.findByConversationAndParticipant(
      conversationId,
      participantId,
      tenantId,
    );
    if (!participant) {
      throw new BusinessException(`"${participantId}" is not a participant of conversation "${conversationId}"`);
    }

    await this.participantRepository.update(participant.id, patch, tenantId, participantId);
  }
}
