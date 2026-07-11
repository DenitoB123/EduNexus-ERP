import { TenantQueryHelper } from '../../database/helpers/tenant-query.helper';
import { AuditableRepository } from './auditable.repository';
import { ISoftDeleteRepository } from './interfaces/soft-delete-repository.interface';

/**
 * Top layer of the B2.2 repository hierarchy — this is what future
 * business modules (Admissions, Students, Finance, HR, Library, etc.)
 * should extend for any entity following the mandatory base-field
 * convention (B1.2: tenantId, version, createdAt/updatedAt,
 * deletedAt, createdBy/updatedBy/deletedBy).
 *
 * Permanent deletion is disabled by default (`allowHardDelete =
 * false`) as a production safety default. A subclass enables it by
 * setting the flag to `true` in its constructor — it does NOT need
 * to reimplement any deletion logic to do so, satisfying "soft
 * delete... without duplicating code in business modules."
 */
export abstract class SoftDeleteRepository<T extends { id: string }>
  extends AuditableRepository<T>
  implements ISoftDeleteRepository<T>
{
  protected allowHardDelete = false;

  async softDelete(id: string, tenantId: string, actorId?: string): Promise<T> {
    await this.assertBelongsToTenant(id, tenantId);
    return this.rawUpdate(TenantQueryHelper.scopeWhere({ id }, tenantId), {
      deletedAt: new Date(),
      deletedBy: actorId,
      updatedBy: actorId,
    });
  }

  async restore(id: string, tenantId: string, actorId?: string): Promise<T> {
    const where = TenantQueryHelper.excludeSoftDeleted(
      TenantQueryHelper.scopeWhere({ id }, tenantId),
      true,
    );
    const existing = await this.rawFindOne(where);
    this.assertFound(existing, id);

    return this.rawUpdate(TenantQueryHelper.scopeWhere({ id }, tenantId), {
      deletedAt: null,
      deletedBy: null,
      updatedBy: actorId,
    });
  }

  async permanentDelete(id: string, tenantId: string): Promise<void> {
    if (!this.allowHardDelete) {
      throw new Error(
        `Permanent deletion is disabled for ${this.modelName}. Set "allowHardDelete = true" in the subclass constructor to enable it.`,
      );
    }

    await this.assertBelongsToTenant(id, tenantId);
    await this.rawHardDelete(TenantQueryHelper.scopeWhere({ id }, tenantId));
  }
}
