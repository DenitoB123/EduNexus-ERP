/**
 * infrastructure.interfaces.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 *
 * This milestone is an independent, parallel package (per the B2.21
 * consolidation plan). It assumes only the Enterprise Backend Foundation
 * (B1.1–B2.2) exists — PrismaService, an Event Bus, a Queue system, a
 * Logger, Audit, Authentication, RBAC, and Multi-tenancy — and references
 * all of them exclusively through the interfaces and DI tokens below.
 * NONE of these are reimplemented here; concrete providers are expected to
 * be supplied when this module is wired into the cumulative backend during
 * B2.21.
 */

// ---------------------------------------------------------------------
// Tenancy / RBAC context
// ---------------------------------------------------------------------

export interface ITenantContext {
  tenantId: string;
  campusId?: string;
  departmentId?: string;
  isCrossTenantOperation?: boolean;
}

export interface IActorContext {
  userId: string;
  roles: string[];
  permissions?: string[];
  isSystemActor?: boolean;
}

/** Composite context passed into every search-module operation. Built upstream by Auth/Tenancy infrastructure (B1.x), not by this module. */
export interface ISearchRequestContext {
  tenant: ITenantContext;
  actor: IActorContext;
  correlationId?: string;
}

// ---------------------------------------------------------------------
// Prisma extension point
// ---------------------------------------------------------------------

/**
 * Minimal Prisma delegate shape this module needs for its own denormalized
 * `search_index` table (see interfaces/search-document.interface.ts). This
 * is NOT a general Prisma client contract for arbitrary business models —
 * the Search module never queries business tables directly; it queries its
 * own index, which business modules populate via IndexingService.
 */
export interface ISearchIndexPrismaDelegate {
  findMany(args: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  count(args?: Record<string, unknown>): Promise<number>;
  create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  upsert(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
  delete(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteMany(args: Record<string, unknown>): Promise<{ count: number }>;
}

/** Extension point satisfied by the real PrismaService from B1.1–B2.2 (assumed to expose a `searchIndex` model/delegate once its schema is merged during B2.21). */
export interface IPrismaClientLike {
  searchIndex: ISearchIndexPrismaDelegate;
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T[]>;
  $transaction<T>(fn: (tx: IPrismaClientLike) => Promise<T>): Promise<T>;
}

// ---------------------------------------------------------------------
// Event Bus extension point
// ---------------------------------------------------------------------

export interface IDomainEvent<TPayload = unknown> {
  eventName: string;
  payload: TPayload;
  occurredAt: Date;
  tenantId?: string;
  correlationId?: string;
}

export interface IEventBus {
  publish<TPayload = unknown>(event: IDomainEvent<TPayload>): Promise<void> | void;
  /** Optional — used by IndexingService to react to domain events from other modules (e.g. "student.created") for automatic indexing, if the host app wires subscriptions this way. */
  subscribe?<TPayload = unknown>(eventName: string, handler: (event: IDomainEvent<TPayload>) => Promise<void> | void): void;
}

// ---------------------------------------------------------------------
// Queue extension point (background indexing)
// ---------------------------------------------------------------------

export interface IQueueJob<TPayload = unknown> {
  name: string;
  payload: TPayload;
  attempts?: number;
  delayMs?: number;
}

export interface IQueueService {
  enqueue<TPayload = unknown>(queueName: string, job: IQueueJob<TPayload>): Promise<void>;
  /** Optional — registers a consumer for a named queue. Concrete queue infra (BullMQ, SQS, etc.) decides how this is actually wired; IndexingWorker exposes the handler this milestone expects to be registered. */
  registerConsumer?<TPayload = unknown>(
    queueName: string,
    handler: (job: IQueueJob<TPayload>) => Promise<void>,
  ): void;
}

// ---------------------------------------------------------------------
// Logger extension point
// ---------------------------------------------------------------------

export interface IAppLogger {
  log(message: string, context?: string, meta?: Record<string, unknown>): void;
  debug(message: string, context?: string, meta?: Record<string, unknown>): void;
  warn(message: string, context?: string, meta?: Record<string, unknown>): void;
  error(message: string, trace?: string, context?: string, meta?: Record<string, unknown>): void;
  metric(name: string, valueMs: number, meta?: Record<string, unknown>): void;
}

// ---------------------------------------------------------------------
// Audit extension point
// ---------------------------------------------------------------------

export interface IAuditEntry {
  action: string;
  entityType: string;
  entityId?: string;
  actorId?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
}

export interface IAuditService {
  record(entry: IAuditEntry): Promise<void> | void;
}

// ---------------------------------------------------------------------
// RBAC extension point
// ---------------------------------------------------------------------

export interface IPermissionChecker {
  hasPermission(userId: string, permission: string, roles: string[]): boolean | Promise<boolean>;
  hasAnyPermission(userId: string, permissions: string[], roles: string[]): boolean | Promise<boolean>;
  /**
   * Optional row-level filter hook: returns a partial where-clause fragment
   * restricting search results to what the actor is permitted to see (e.g.
   * department-scoped visibility). If absent, RankingService/SearchService
   * fall back to tenant-only isolation.
   */
  buildVisibilityFilter?(context: ISearchRequestContext, entityType?: string): Record<string, unknown> | undefined;
}

// ---------------------------------------------------------------------
// Optional cache extension point (Redis or similar)
// ---------------------------------------------------------------------

export interface ICacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr?(key: string): Promise<number>;
}
