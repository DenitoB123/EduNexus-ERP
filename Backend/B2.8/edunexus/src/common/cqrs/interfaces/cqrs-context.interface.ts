/**
 * Execution context threaded through the Command Bus and Query Bus
 * pipelines. Deliberately mirrors the shape already established by
 * `TenantContextData` (database/interfaces/tenant-context.interface.ts)
 * and the `AuthContext` extension point declared in
 * `common/decorators/current-user.decorator.ts`, rather than inventing
 * a third, incompatible context shape.
 *
 * Nothing in B1.1-B2.2 populates `roles`/`permissions` on a live
 * request yet (no Auth/Users module exists until a later phase) — this
 * interface is the CQRS-side extension point B2.6 (RBAC/Authorization
 * milestone) is expected to fill in. Until then, authorization
 * behaviors degrade the same way `RolesGuard`/`PermissionsGuard`
 * already do: log a warning and allow the request through.
 */
export interface ICqrsExecutionContext {
  readonly tenantId?: string;
  readonly schoolGroupId?: string;
  readonly schoolId?: string;
  readonly campusId?: string;
  readonly actorId?: string;
  readonly correlationId: string;
  readonly roles?: string[];
  readonly permissions?: string[];
  /** True when no auth context was available to populate roles/permissions. */
  readonly isAuthContextMissing?: boolean;
}
