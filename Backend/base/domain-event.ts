/**
 * The domain layer's DomainEvent is the same class already defined
 * in the infrastructure event bus (B1.3) — re-exported here so
 * AggregateRoot and future domain entities can raise events using
 * one canonical DomainEvent/IntegrationEvent contract that the
 * EventBus already knows how to dispatch, instead of introducing a
 * second, incompatible event shape.
 */
export { DomainEvent, IntegrationEvent } from '../../infrastructure/events/event.base';
export type { IEvent as IDomainEventBase } from '../../infrastructure/interfaces/event.interface';
