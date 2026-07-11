import { IEvent, IEventHandler } from '../interfaces/event.interface';

export abstract class EventHandlerBase<T extends IEvent = IEvent> implements IEventHandler<T> {
  abstract readonly eventName: string;
  abstract handle(event: T): Promise<void>;
}
