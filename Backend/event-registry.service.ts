import { Injectable } from '@nestjs/common';
import { IEvent, IEventHandler } from '../interfaces/event.interface';

@Injectable()
export class EventRegistry {
  private readonly handlers = new Map<string, IEventHandler<IEvent>[]>();
  /** B2.7 — Broadcast: handlers registered here run for every dispatched event, regardless of eventName. */
  private readonly globalHandlers: IEventHandler<IEvent>[] = [];

  register(eventName: string, handler: IEventHandler<IEvent>): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler);
    this.handlers.set(eventName, this.sortByPriority(existing));
  }

  /** B2.7 — registers a handler that receives every event dispatched through the bus (e.g. PersistAllEventsSubscriber). */
  registerGlobal(handler: IEventHandler<IEvent>): void {
    this.globalHandlers.push(handler);
  }

  unregister(eventName: string, handler: IEventHandler<IEvent>): void {
    const existing = this.handlers.get(eventName);
    if (!existing) return;
    this.handlers.set(
      eventName,
      existing.filter((h) => h !== handler),
    );
  }

  getHandlers(eventName: string): IEventHandler<IEvent>[] {
    return this.handlers.get(eventName) ?? [];
  }

  getGlobalHandlers(): IEventHandler<IEvent>[] {
    return this.globalHandlers;
  }

  listEventNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /** B2.7 — Ordered Execution: higher `priority` handlers run first among handlers of the same event. */
  private sortByPriority(handlers: IEventHandler<IEvent>[]): IEventHandler<IEvent>[] {
    return [...handlers].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }
}
