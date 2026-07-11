import { Injectable } from '@nestjs/common';
import { SoftDeleteRepository } from '../../repositories/soft-delete.repository';
import { PrismaFullModelDelegate } from '../../repositories/interfaces/prisma-full-delegate.interface';
import { TenantQueryHelper } from '../../../database/helpers/tenant-query.helper';
import { MessageEntity } from '../entities/message.entity';
import { QueryOptions, PaginatedResult } from '../../../database/interfaces/base-model.interface';

@Injectable()
export class MessageRepository extends SoftDeleteRepository<MessageEntity> {
  protected readonly modelName = 'Message';
  protected readonly allowedFilterFields = ['conversationId', 'senderId', 'type', 'isDeleted'];
  protected readonly allowedSearchFields = ['content'];

  constructor(delegate: PrismaFullModelDelegate<MessageEntity>) {
    super(delegate);
  }

  async listByConversation(
    conversationId: string,
    tenantId: string,
    options: QueryOptions = {},
  ): Promise<PaginatedResult<MessageEntity>> {
    const extraWhere = TenantQueryHelper.excludeSoftDeleted(
      TenantQueryHelper.scopeWhere({ conversationId }, tenantId),
      options.includeDeleted,
    );
    return this.rawFindMany({ ...options, sort: options.sort ?? [{ field: 'createdAt', order: 'desc' }] }, extraWhere);
  }
}
