import { Injectable } from '@nestjs/common';
import { SoftDeleteRepository } from '../../repositories/soft-delete.repository';
import { PrismaFullModelDelegate } from '../../repositories/interfaces/prisma-full-delegate.interface';
import { TenantQueryHelper } from '../../../database/helpers/tenant-query.helper';
import { ConversationParticipantEntity } from '../entities/conversation-participant.entity';

@Injectable()
export class ConversationParticipantRepository extends SoftDeleteRepository<ConversationParticipantEntity> {
  protected readonly modelName = 'ConversationParticipant';
  protected readonly allowedFilterFields = ['conversationId', 'participantId', 'role', 'isArchived', 'isPinned'];
  protected readonly allowedSearchFields = [];

  constructor(delegate: PrismaFullModelDelegate<ConversationParticipantEntity>) {
    super(delegate);
  }

  async findByConversationAndParticipant(
    conversationId: string,
    participantId: string,
    tenantId: string,
  ): Promise<ConversationParticipantEntity | null> {
    return this.rawFindOne(
      TenantQueryHelper.excludeSoftDeleted(TenantQueryHelper.scopeWhere({ conversationId, participantId }, tenantId)),
    );
  }

  async listByConversation(conversationId: string, tenantId: string): Promise<ConversationParticipantEntity[]> {
    const result = await this.rawFindMany(
      { pagination: { page: 1, pageSize: 500 } },
      TenantQueryHelper.excludeSoftDeleted(TenantQueryHelper.scopeWhere({ conversationId }, tenantId)),
    );
    return result.items;
  }

  async listByParticipant(participantId: string, tenantId: string): Promise<ConversationParticipantEntity[]> {
    const result = await this.rawFindMany(
      { pagination: { page: 1, pageSize: 500 } },
      TenantQueryHelper.excludeSoftDeleted(TenantQueryHelper.scopeWhere({ participantId }, tenantId)),
    );
    return result.items;
  }
}
