import { Injectable } from '@nestjs/common';
import { SoftDeleteRepository } from '../../repositories/soft-delete.repository';
import { PrismaFullModelDelegate } from '../../repositories/interfaces/prisma-full-delegate.interface';
import { TenantQueryHelper } from '../../../database/helpers/tenant-query.helper';
import { ConversationEntity } from '../entities/conversation.entity';
import { QueryOptions, PaginatedResult } from '../../../database/interfaces/base-model.interface';

/**
 * Extends B2.2's repository hierarchy directly — tenancy, auditing,
 * and soft-delete come from `SoftDeleteRepository` unchanged, exactly
 * the "future business modules... extend this for any entity
 * following the base-field convention" usage that layer's own doc
 * comment describes.
 */
@Injectable()
export class ConversationRepository extends SoftDeleteRepository<ConversationEntity> {
  protected readonly modelName = 'Conversation';
  protected readonly allowedFilterFields = ['type', 'isLocked', 'linkedEntityType', 'linkedEntityId'];
  protected readonly allowedSearchFields = ['title'];

  constructor(delegate: PrismaFullModelDelegate<ConversationEntity>) {
    super(delegate);
  }

  async touchLastMessageAt(id: string, tenantId: string, at: Date): Promise<void> {
    await this.rawUpdate({ id, tenantId }, { lastMessageAt: at });
  }

  async findByLinkedEntity(entityType: string, entityId: string, tenantId: string): Promise<ConversationEntity | null> {
    return this.rawFindOne(
      TenantQueryHelper.excludeSoftDeleted(
        TenantQueryHelper.scopeWhere({ linkedEntityType: entityType, linkedEntityId: entityId }, tenantId),
      ),
    );
  }

  /**
   * `id IN (...)` isn't in `allowedFilterFields` (that allowlist is
   * for caller-supplied filters coming through `findMany`'s generic
   * `QueryOptions.filters`, where an unrestricted `id` filter would
   * be an odd thing for a caller to pass and easy to confuse with a
   * lookup bypassing tenant scoping). Membership-based conversation
   * listing is a real, repository-specific need, so it gets its own
   * method with an explicit, tenant-scoped, soft-delete-aware query
   * instead of stretching the generic filter allowlist to cover it.
   */
  async findByIds(ids: string[], tenantId: string, options: QueryOptions = {}): Promise<PaginatedResult<ConversationEntity>> {
    if (ids.length === 0) {
      const page = options.pagination?.page ?? 1;
      const pageSize = options.pagination?.pageSize ?? 20;
      return {
        items: [],
        meta: { page, pageSize, totalItems: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
      };
    }

    const extraWhere = TenantQueryHelper.excludeSoftDeleted(
      TenantQueryHelper.scopeWhere({ id: { in: ids } }, tenantId),
      options.includeDeleted,
    );
    return this.rawFindMany(options, extraWhere);
  }
}

