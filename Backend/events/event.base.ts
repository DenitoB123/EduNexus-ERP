import { randomUUID } from 'crypto';
import { IEvent } from '../interfaces/event.interface';

export abstract class DomainEvent implements IEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  tenantId?: string;
  correlationId?: string;

  constructor(public readonly eventName: string) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
  }
}

export abstract class IntegrationEvent implements IEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  tenantId?: string;
  correlationId?: string;

  constructor(
    public readonly eventName: string,
    public readonly source: string,
  ) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
  }
}
