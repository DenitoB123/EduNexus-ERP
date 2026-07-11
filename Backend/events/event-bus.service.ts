import { Injectable } from '@nestjs/common';
import { IEvent, IEventHandler } from '../interfaces/event.interface';
import { EventDispatcher } from './event-dispatcher.service';
import { EventRegistry } from './event-registry.service';

@Injectable()
export class EventBus {
  constructor(
    private readonly dispatcher: EventDispatcher,
    private readonly registry: EventRegistry,
  ) {}

  async emit(event: IEvent): Promise<void> {
    await this.dispatcher.dispatch(event);
  }

  subscribe<T extends IEvent>(eventName: string, handler: IEventHandler<T>): void {
    this.registry.register(eventName, handler as IEventHandler<IEvent>);
  }
}
