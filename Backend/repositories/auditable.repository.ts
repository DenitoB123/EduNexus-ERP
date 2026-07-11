import { TenantQueryHelper } from '../../database/helpers/tenant-query.helper';
import { TenantRepository } from './tenant.repository';

/**
 * Adds automatic createdBy/updatedBy actor stamping on top of
 * TenantRepository. createdAt/updatedAt remain Prisma's own
 * @default(now())/@updatedAt column-level responsibility (B1.2
 * convention) — this layer only handles the actor-identity fields
 * that Prisma can't infer on its own.
 */
export abstract class AuditableRepository<T extends { id: string }> extends TenantRepository<T> {
  async create(data: Partial<T>, tenantId: string, actorId?: string): Promise<T> {
    return this.rawCreate({
      ...data,
      tenantId,
      createdBy: actorId,
      updatedBy: actorId,
    } as Record<string, unknown>);
  }

  async update(id: string, data: Partial<T>, tenantId: string, actorId?: string): Promise<T> {
    await this.assertBelongsToTenant(id, tenantId);
    return this.rawUpdate(TenantQueryHelper.scopeWhere({ id }, tenantId), {
      ...data,
      updatedBy: actorId,
    } as Record<string, unknown>);
  }

  async upsert(
    id: string,
    createData: Partial<T>,
    updateData: Partial<T>,
    tenantId: string,
    actorId?: string,
  ): Promise<T> {
    return this.rawUpsert(
      TenantQueryHelper.scopeWhere({ id }, tenantId),
      { ...createData, id, tenantId, createdBy: actorId, updatedBy: actorId } as Record<string, unknown>,
      { ...updateData, updatedBy: actorId } as Record<string, unknown>,
    );
  }

  async batchCreate(items: Partial<T>[], tenantId: string, actorId?: string): Promise<number> {
    return this.rawBatchCreate(
      items.map((item) => ({
        ...item,
        tenantId,
        createdBy: actorId,
        updatedBy: actorId,
      }) as Record<string, unknown>),
    );
  }

  async batchUpdate(ids: string[], data: Partial<T>, tenantId: string, actorId?: string): Promise<number> {
    return this.rawBatchUpdate(TenantQueryHelper.scopeWhere({ id: { in: ids } }, tenantId), {
      ...data,
      updatedBy: actorId,
    } as Record<string, unknown>);
  }
}
