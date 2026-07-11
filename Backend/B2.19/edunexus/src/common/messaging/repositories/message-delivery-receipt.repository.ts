import { Injectable } from '@nestjs/common';
import { SoftDeleteRepository } from '../../repositories/soft-delete.repository';
import { PrismaFullModelDelegate } from '../../repositories/interfaces/prisma-full-delegate.interface';
import { TenantQueryHelper } from '../../../database/helpers/tenant-query.helper';
import { MessageDeliveryReceiptEntity } from '../entities/message-delivery-receipt.entity';
import { DeliveryStatus } from '../enums/delivery-status.enum';

@Injectable()
export class MessageDeliveryReceiptRepository extends SoftDeleteRepository<MessageDeliveryReceiptEntity> {
  protected readonly modelName = 'MessageDeliveryReceipt';
  protected readonly allowedFilterFields = ['messageId', 'participantId', 'status'];
  protected readonly allowedSearchFields = [];

  constructor(delegate: PrismaFullModelDelegate<MessageDeliveryReceiptEntity>) {
    super(delegate);
  }

  async findForMessageAndParticipant(
    messageId: string,
    participantId: string,
    tenantId: string,
  ): Promise<MessageDeliveryReceiptEntity | null> {
    return this.rawFindOne(
      TenantQueryHelper.excludeSoftDeleted(TenantQueryHelper.scopeWhere({ messageId, participantId }, tenantId)),
    );
  }

  async listByMessage(messageId: string, tenantId: string): Promise<MessageDeliveryReceiptEntity[]> {
    const result = await this.rawFindMany(
      { pagination: { page: 1, pageSize: 500 } },
      TenantQueryHelper.excludeSoftDeleted(TenantQueryHelper.scopeWhere({ messageId }, tenantId)),
    );
    return result.items;
  }

  async listFailedForRetry(tenantId: string, maxRetryCount: number): Promise<MessageDeliveryReceiptEntity[]> {
    const result = await this.rawFindMany(
      { pagination: { page: 1, pageSize: 200 } },
      TenantQueryHelper.excludeSoftDeleted(
        TenantQueryHelper.scopeWhere({ status: DeliveryStatus.FAILED, retryCount: { lt: maxRetryCount } }, tenantId),
      ),
    );
    return result.items;
  }
}
