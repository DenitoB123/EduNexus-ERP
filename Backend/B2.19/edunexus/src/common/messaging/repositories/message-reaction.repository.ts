import { Injectable } from '@nestjs/common';
import { SoftDeleteRepository } from '../../repositories/soft-delete.repository';
import { PrismaFullModelDelegate } from '../../repositories/interfaces/prisma-full-delegate.interface';
import { TenantQueryHelper } from '../../../database/helpers/tenant-query.helper';
import { MessageReactionEntity } from '../entities/message-reaction.entity';

@Injectable()
export class MessageReactionRepository extends SoftDeleteRepository<MessageReactionEntity> {
  protected readonly modelName = 'MessageReaction';
  protected readonly allowedFilterFields = ['messageId', 'participantId', 'emoji'];
  protected readonly allowedSearchFields = [];

  constructor(delegate: PrismaFullModelDelegate<MessageReactionEntity>) {
    super(delegate);
  }

  async findOneReaction(
    messageId: string,
    participantId: string,
    emoji: string,
    tenantId: string,
  ): Promise<MessageReactionEntity | null> {
    return this.rawFindOne(
      TenantQueryHelper.excludeSoftDeleted(TenantQueryHelper.scopeWhere({ messageId, participantId, emoji }, tenantId)),
    );
  }

  async listByMessage(messageId: string, tenantId: string): Promise<MessageReactionEntity[]> {
    const result = await this.rawFindMany(
      { pagination: { page: 1, pageSize: 200 } },
      TenantQueryHelper.excludeSoftDeleted(TenantQueryHelper.scopeWhere({ messageId }, tenantId)),
    );
    return result.items;
  }
}
