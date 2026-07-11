import { Injectable } from '@nestjs/common';
import { SoftDeleteRepository } from '../../repositories/soft-delete.repository';
import { PrismaFullModelDelegate } from '../../repositories/interfaces/prisma-full-delegate.interface';
import { TenantQueryHelper } from '../../../database/helpers/tenant-query.helper';
import { CollaborationActivityEntity } from '../entities/collaboration-activity.entity';

@Injectable()
export class CollaborationActivityRepository extends SoftDeleteRepository<CollaborationActivityEntity> {
  protected readonly modelName = 'CollaborationActivity';
  protected readonly allowedFilterFields = ['activityType', 'actorId', 'entityType', 'entityId'];
  protected readonly allowedSearchFields = [];

  constructor(delegate: PrismaFullModelDelegate<CollaborationActivityEntity>) {
    super(delegate);
  }

  async listForEntity(entityType: string, entityId: string, tenantId: string): Promise<CollaborationActivityEntity[]> {
    const result = await this.rawFindMany(
      { pagination: { page: 1, pageSize: 100 }, sort: [{ field: 'createdAt', order: 'desc' }] },
      TenantQueryHelper.excludeSoftDeleted(TenantQueryHelper.scopeWhere({ entityType, entityId }, tenantId)),
    );
    return result.items;
  }
}
