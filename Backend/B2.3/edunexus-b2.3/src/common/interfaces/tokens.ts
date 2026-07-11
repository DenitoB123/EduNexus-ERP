/**
 * tokens.ts
 *
 * B2.3 — Generic Service Layer
 *
 * Injection tokens for every external dependency the Generic Service Layer
 * relies on but does not implement. Concrete providers for these tokens are
 * expected to be registered by the modules delivered in B1.1–B2.2 (or later
 * consolidation) when this milestone is merged into the cumulative backend.
 *
 * Business modules extending BaseService/CrudService/etc. do not need to
 * touch these tokens directly — they are wired once at the module level.
 */

/** Repository contract for a given entity (see repository.interfaces.ts). Provided per-entity by B2.2. */
export const BASE_REPOSITORY = Symbol('BASE_REPOSITORY');

/** Request-scoped context (tenant + actor). Provided by B1.x auth/tenancy infrastructure. */
export const REQUEST_CONTEXT = Symbol('REQUEST_CONTEXT');

/** Transaction manager (see transaction-manager.interface.ts). Provided by B2.2 transaction infrastructure. */
export const TRANSACTION_MANAGER = Symbol('TRANSACTION_MANAGER');

/** Domain event publisher (see domain-event-publisher.interface.ts). Provided by prior domain-event infrastructure. */
export const DOMAIN_EVENT_PUBLISHER = Symbol('DOMAIN_EVENT_PUBLISHER');

/** Structured logger. Provided by shared logging infrastructure. */
export const APP_LOGGER = Symbol('APP_LOGGER');

/** Standardized enterprise exception factory. Provided by the shared exception framework. */
export const EXCEPTION_FACTORY = Symbol('EXCEPTION_FACTORY');

/** Permission/RBAC checker used by permission validators. Provided by RBAC infrastructure. */
export const PERMISSION_CHECKER = Symbol('PERMISSION_CHECKER');

/** Audit field writer/strategy. Provided by Auditing infrastructure. Optional — AuditableService falls back to direct field assignment if absent. */
export const AUDIT_FIELD_STRATEGY = Symbol('AUDIT_FIELD_STRATEGY');
