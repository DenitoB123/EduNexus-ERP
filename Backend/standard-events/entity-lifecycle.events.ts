import { DomainEvent, EventBaseOptions } from '../event.base';

/**
 * B2.7 — Standard domain events reusable by every future business
 * module (B3+). Generic over `T` so modules don't need to declare a
 * bespoke "XCreatedEvent" for every entity — they may still choose to
 * subclass for a strongly-named event (e.g. `StudentEnrolledEvent`
 * already used in B2.1's test), but for straightforward CRUD lifecycle
 * these four cover the common case without duplicating boilerplate.
 */

export interface EntityEventOptions extends EventBaseOptions {
  entityType: string;
  entityId: string;
}

export class EntityCreatedEvent<T = Record<string, unknown>> extends DomainEvent {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly entity: T,
    options?: EventBaseOptions,
  ) {
    super(`${entityType}.created`, {
      ...options,
      aggregateId: entityId,
      aggregateType: entityType,
    });
  }
}

export class EntityUpdatedEvent<T = Record<string, unknown>> extends DomainEvent {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly before: Partial<T>,
    public readonly after: Partial<T>,
    options?: EventBaseOptions,
  ) {
    super(`${entityType}.updated`, {
      ...options,
      aggregateId: entityId,
      aggregateType: entityType,
    });
  }
}

export class EntityDeletedEvent extends DomainEvent {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly soft: boolean,
    options?: EventBaseOptions,
  ) {
    super(`${entityType}.deleted`, {
      ...options,
      aggregateId: entityId,
      aggregateType: entityType,
    });
  }
}

export class EntityRestoredEvent extends DomainEvent {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    options?: EventBaseOptions,
  ) {
    super(`${entityType}.restored`, {
      ...options,
      aggregateId: entityId,
      aggregateType: entityType,
    });
  }
}
