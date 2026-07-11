/**
 * domain-event.interface.ts
 *
 * B2.3 — Generic Service Layer — Domain Event Publishing
 *
 * Shape of a domain event as emitted automatically by BaseService for
 * create/update/delete/restore operations. This does NOT reimplement the
 * domain-event bus/infrastructure from earlier milestones — it only defines
 * the event envelope this milestone produces, to be consumed by that bus.
 */

export type DomainEventOperation = 'create' | 'update' | 'delete' | 'softDelete' | 'restore';

export interface IDomainEvent<TPayload = unknown> {
  /** e.g. "student.created", "invoice.updated" — module should namespace by entity. */
  eventName: string;
  operation: DomainEventOperation;
  entityName: string;
  entityId: string | number;
  tenantId: string;
  actorId?: string;
  occurredAt: Date;
  payload: TPayload;
  /** Previous state, populated for update/delete/restore where useful for consumers (e.g. diffing). */
  previousPayload?: TPayload;
  correlationId?: string;
}
