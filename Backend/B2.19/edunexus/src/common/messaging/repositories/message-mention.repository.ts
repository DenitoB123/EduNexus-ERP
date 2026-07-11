import { Injectable } from '@nestjs/common';
import { SoftDeleteRepository } from '../../repositories/soft-delete.repository';
import { PrismaFullModelDelegate } from '../../repositories/interfaces/prisma-full-delegate.interface';
import { TenantQueryHelper } from '../../../database/helpers/tenant-query.helper';
import { MessageMentionEntity } from '../entities/message-mention.entity';

@Injectable()
export class MessageMentionRepository extends SoftDeleteRepository<MessageMentionEntity> {
  protected readonly modelName = 'MessageMention';
  protected readonly allowedFilterFields = ['messageId', 'mentionedParticipantId'];
  protected readonly allowedSearchFields = [];

  constructor(delegate: PrismaFullModelDelegate<MessageMentionEntity>) {
    super(delegate);
  }

  async listByParticipant(mentionedParticipantId: string, tenantId: string): Promise<MessageMentionEntity[]> {
    const result = await this.rawFindMany(
      { pagination: { page: 1, pageSize: 100 }, sort: [{ field: 'createdAt', order: 'desc' }] },
      TenantQueryHelper.excludeSoftDeleted(TenantQueryHelper.scopeWhere({ mentionedParticipantId }, tenantId)),
    );
    return result.items;
  }
}
