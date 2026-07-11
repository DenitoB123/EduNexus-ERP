/**
 * event-bus.interface.ts
 *
 * B2.9 — Enterprise Asynchronous Processing Framework
 *
 * The interface business modules depend on for messaging
 * (`eventBus.publish(...)`), per the dual-engine enterprise abstraction
 * requirement: modules never import RabbitMQ types directly. Concrete
 * implementation: RabbitMqEventBusAdapter (../../providers/rabbitmq-event-bus.adapter.ts).
 */

import { IEvent, IEventHandler } from '../../../infrastructure/interfaces/event.interface';

export const EVENT_BUS = Symbol('EVENT_BUS');

export interface IEventBus {
  publish<T extends IEvent>(event: T): Promise<void>;
  on<T extends IEvent>(eventName: string, handler: IEventHandler<T>): void;
}
