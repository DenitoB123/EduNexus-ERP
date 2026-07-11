import { Injectable } from '@nestjs/common';
import { SoftDeleteRepository } from '../../repositories/soft-delete.repository';
import { PrismaFullModelDelegate } from '../../repositories/interfaces/prisma-full-delegate.interface';
import { TenantQueryHelper } from '../../../database/helpers/tenant-query.helper';
import { AnnouncementEntity } from '../entities/announcement.entity';

@Injectable()
export class AnnouncementRepository extends SoftDeleteRepository<AnnouncementEntity> {
  protected readonly modelName = 'Announcement';
  protected readonly allowedFilterFields = ['audienceType', 'isPublished'];
  protected readonly allowedSearchFields = ['title', 'body'];

  constructor(delegate: PrismaFullModelDelegate<AnnouncementEntity>) {
    super(delegate);
  }

  async listDueForPublish(tenantId: string, asOf: Date): Promise<AnnouncementEntity[]> {
    const result = await this.rawFindMany(
      { pagination: { page: 1, pageSize: 200 } },
      TenantQueryHelper.excludeSoftDeleted(
        TenantQueryHelper.scopeWhere({ isPublished: false, scheduledAt: { lte: asOf } }, tenantId),
      ),
    );
    return result.items;
  }
}
