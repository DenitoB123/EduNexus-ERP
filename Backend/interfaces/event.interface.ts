export interface IEvent {
  eventId: string;
  eventName: string;
  occurredAt: Date;
  tenantId?: string;
  correlationId?: string;
}

export interface IEventHandler<T extends IEvent = IEvent> {
  handle(event: T): Promise<void>;
}

export type EventMiddlewareFn = (event: IEvent, next: () => Promise<void>) => Promise<void>;
