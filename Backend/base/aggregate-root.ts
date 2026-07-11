import { BaseEntity } from './base-entity';
import { DomainEvent } from './domain-event';
import { IAggregateRoot, IDomainEvent } from '../interfaces/domain.interfaces';

/**
 * Base class for aggregate roots: the single entry point of
 * consistency for a cluster of entities/value objects. Aggregates
 * raise DomainEvents internally via `addDomainEvent`; the events sit
 * "uncommitted" until the application/service layer calls
 * `getUncommittedEvents()` after a successful persistence operation
 * and publishes them through the EventBus (B1.3), then calls
 * `clearUncommittedEvents()`.
 *
 * This intentionally does NOT auto-publish events itself — publishing
 * before the transaction commits would leak events for writes that
 * later roll back.
 */
export abstract class AggregateRoot extends BaseEntity implements IAggregateRoot<string> {
  private uncommittedEvents: IDomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event);
  }

  getUncommittedEvents(): IDomainEvent[] {
    return [...this.uncommittedEvents];
  }

  clearUncommittedEvents(): void {
    this.uncommittedEvents = [];
  }
}
