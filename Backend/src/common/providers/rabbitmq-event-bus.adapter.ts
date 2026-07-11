/**
 * rabbitmq-event-bus.adapter.ts
 *
 * B2.9 — Enterprise Asynchronous Processing Framework
 *
 * Thin, purely additive wrapper around the *existing*, unmodified
 * `EventBus` (infrastructure/events/event-bus.service.ts, B1.3). Does not
 * reimplement pub/sub, exchanges, or consumers — only renames the call
 * shape (`publish`/`on` instead of `emit`/`subscribe`) behind `IEventBus`
 * so business modules never import RabbitMQ-specific types directly.
 * Anything already calling `EventBus.emit()`/`subscribe()` directly
 * (B2.8's CQRS projections, this framework's own JobProcessorBase) keeps
 * doing so unchanged — this adapter is an additional entry point, not a
 * replacement for EventBus.
 */

import { Injectable } from '@nestjs/common';
import { EventBus } from '../../infrastructure/events/event-bus.service';
import { IEvent, IEventHandler } from '../../infrastructure/interfaces/event.interface';
import { IEventBus } from '../interfaces/background/event-bus.interface';

@Injectable()
export class RabbitMqEventBusAdapter implements IEventBus {
  constructor(private readonly eventBus: EventBus) {}

  async publish<T extends IEvent>(event: T): Promise<void> {
    await this.eventBus.emit(event);
  }

  on<T extends IEvent>(eventName: string, handler: IEventHandler<T>): void {
    this.eventBus.subscribe(eventName, handler);
  }
}
