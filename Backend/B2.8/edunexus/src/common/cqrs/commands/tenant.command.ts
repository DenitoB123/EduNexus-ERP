import { BaseCommand } from './base.command';

/**
 * A command scoped to a tenant/school/campus. Mirrors the same
 * base-field convention used by `BaseModel`
 * (database/interfaces/base-model.interface.ts) so command payloads
 * and persisted entities share one vocabulary for tenancy fields.
 *
 * `TenancyBehavior` in the Command Bus pipeline enforces that
 * `tenantId` is present (either on the command or resolvable from the
 * `ICqrsExecutionContext`/`TenantContextService`) before a
 * `TenantCommand` reaches its handler.
 */
export abstract class TenantCommand extends BaseCommand {
  protected constructor(
    public readonly tenantId: string,
    public readonly schoolGroupId?: string,
    public readonly schoolId?: string,
    public readonly campusId?: string,
  ) {
    super();
  }
}
