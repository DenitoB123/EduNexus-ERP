import { ITenantRepository } from './tenant-repository.interface';

/**
 * Marker interface for repositories that automatically stamp
 * createdBy/updatedBy on every write from the supplied actorId. No
 * additional methods beyond ITenantRepository — the guarantee is
 * behavioral (see AuditableRepository), not a new API surface.
 */
export type IAuditableRepository<T, CreateInput = Partial<T>, UpdateInput = Partial<T>> =
  ITenantRepository<T, CreateInput, UpdateInput>;
