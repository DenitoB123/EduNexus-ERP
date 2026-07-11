import { TenantCommand } from './tenant.command';

/**
 * A tenant-scoped command that also carries the identity of the actor
 * performing it. `actorId` flows straight into
 * `AuditableRepository`/`SoftDeleteRepository` (B2.2) createdBy/
 * updatedBy stamping when a handler calls into the repository layer,
 * so audit trails stay consistent between the CQRS path and any
 * direct-service path still in use during the migration to B3.
 */
export abstract class AuthenticatedCommand extends TenantCommand {
  protected constructor(
    tenantId: string,
    public readonly actorId: string,
    schoolGroupId?: string,
    schoolId?: string,
    campusId?: string,
  ) {
    super(tenantId, schoolGroupId, schoolId, campusId);
  }
}
