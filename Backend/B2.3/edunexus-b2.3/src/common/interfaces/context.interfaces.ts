/**
 * context.interfaces.ts
 *
 * B2.3 — Generic Service Layer
 *
 * These interfaces describe the shape of contextual data that the Generic
 * Service Layer depends on. They are DEFINED here as extension points/contracts
 * only. The concrete population of this data (from JWT claims, headers,
 * middleware, guards, etc.) is the responsibility of the Authentication and
 * Tenancy infrastructure delivered in earlier milestones (B1.x / B2.1 / B2.2)
 * and is NOT reimplemented in this milestone.
 *
 * When this milestone is merged into the cumulative backend, the real
 * RequestContext / TenantContext providers from those milestones should
 * satisfy these interfaces (or be adapted with a thin mapper).
 */

/**
 * Identifies the tenant/school/campus scope of the current operation.
 * Populated upstream by tenancy middleware/guards (B2.x tenancy infrastructure).
 */
export interface ITenantContext {
  tenantId: string;
  schoolId?: string;
  campusId?: string;

  /** True for platform/super-admin operations that intentionally cross tenants. */
  isCrossTenantOperation?: boolean;
}

/**
 * Identifies the authenticated actor performing the current operation.
 * Populated upstream by authentication infrastructure.
 */
export interface IActorContext {
  userId: string;
  roles: string[];
  permissions?: string[];

  /** True for system/background-job initiated operations (no human actor). */
  isSystemActor?: boolean;
}

/**
 * Composite request-scoped context passed into every generic service call.
 * A concrete implementation is expected to be provided via DI (see
 * REQUEST_CONTEXT token in tokens.ts) by the request-scoped infrastructure
 * from earlier milestones (e.g. an AsyncLocalStorage-backed provider, or a
 * REQUEST-scoped Nest provider).
 */
export interface IRequestContext {
  tenant: ITenantContext;
  actor: IActorContext;
  correlationId?: string;
  requestId?: string;
  timestamp?: Date;
}

/**
 * Fields that auditable entities/records are expected to expose.
 * The concrete audit field population strategy (interceptor, Prisma
 * middleware, etc.) belongs to the Auditing infrastructure from earlier
 * milestones. AuditableService (this milestone) only reads/writes these
 * well-known field names.
 */
export interface IAuditFields {
  createdAt?: Date;
  createdBy?: string;
  updatedAt?: Date;
  updatedBy?: string;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  restoredAt?: Date | null;
  restoredBy?: string | null;
}
