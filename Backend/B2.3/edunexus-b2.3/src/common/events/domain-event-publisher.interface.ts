/**
 * domain-event-publisher.interface.ts
 *
 * B2.3 — Generic Service Layer — Domain Event Publishing
 *
 * Contract for the domain event bus. The concrete publisher (in-process
 * EventEmitter2, outbox pattern, message broker adapter, etc.) belongs to
 * the domain-event infrastructure built in an earlier milestone and is
 * injected via the DOMAIN_EVENT_PUBLISHER token.
 */

import { IDomainEvent } from './domain-event.interface';

export interface IDomainEventPublisher {
  publish<TPayload = unknown>(event: IDomainEvent<TPayload>): Promise<void> | void;
  publishMany<TPayload = unknown>(events: IDomainEvent<TPayload>[]): Promise<void> | void;
}
