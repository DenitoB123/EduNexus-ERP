import { Injectable } from '@nestjs/common';
import { IEvent, IEventHandler } from '../interfaces/event.interface';

@Injectable()
export class EventRegistry {
  private readonly handlers = new Map<string, IEventHandler<IEvent>[]>();

  register(eventName: string, handler: IEventHandler<IEvent>): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler);
    this.handlers.set(eventName, existing);
  }

  getHandlers(eventName: string): IEventHandler<IEvent>[] {
    return this.handlers.get(eventName) ?? [];
  }

  listEventNames(): string[] {
    return Array.from(this.handlers.keys());
  }
}
