import { Injectable } from '@nestjs/common';
import { SoftDeleteRepository } from '../../repositories/soft-delete.repository';
import { PrismaFullModelDelegate } from '../../repositories/interfaces/prisma-full-delegate.interface';
import { TenantQueryHelper } from '../../../database/helpers/tenant-query.helper';
import { ModerationFlagEntity } from '../entities/moderation-flag.entity';
import { ModerationTargetType } from '../enums/moderation.enum';

@Injectable()
export class ModerationFlagRepository extends SoftDeleteRepository<ModerationFlagEntity> {
  protected readonly modelName = 'ModerationFlag';
  protected readonly allowedFilterFields = ['targetType', 'targetId', 'status', 'flaggedBy'];
  protected readonly allowedSearchFields = ['reason'];

  constructor(delegate: PrismaFullModelDelegate<ModerationFlagEntity>) {
    super(delegate);
  }

  async listForTarget(
    targetType: ModerationTargetType,
    targetId: string,
    tenantId: string,
  ): Promise<ModerationFlagEntity[]> {
    const result = await this.rawFindMany(
      { pagination: { page: 1, pageSize: 100 } },
      TenantQueryHelper.excludeSoftDeleted(TenantQueryHelper.scopeWhere({ targetType, targetId }, tenantId)),
    );
    return result.items;
  }
}
