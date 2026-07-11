import { Injectable } from '@nestjs/common';
import { SoftDeleteRepository } from '../../repositories/soft-delete.repository';
import { PrismaFullModelDelegate } from '../../repositories/interfaces/prisma-full-delegate.interface';
import { TenantQueryHelper } from '../../../database/helpers/tenant-query.helper';
import { MessageAttachmentEntity } from '../entities/message-attachment.entity';

@Injectable()
export class MessageAttachmentRepository extends SoftDeleteRepository<MessageAttachmentEntity> {
  protected readonly modelName = 'MessageAttachment';
  protected readonly allowedFilterFields = ['messageId', 'kind', 'mimeType'];
  protected readonly allowedSearchFields = ['fileName'];

  constructor(delegate: PrismaFullModelDelegate<MessageAttachmentEntity>) {
    super(delegate);
  }

  async listByMessage(messageId: string, tenantId: string): Promise<MessageAttachmentEntity[]> {
    const result = await this.rawFindMany(
      { pagination: { page: 1, pageSize: 100 } },
      TenantQueryHelper.excludeSoftDeleted(TenantQueryHelper.scopeWhere({ messageId }, tenantId)),
    );
    return result.items;
  }
}
