import { Injectable } from '@nestjs/common';
import { IEvent, IEventHandler } from '../interfaces/event.interface';
import { EventDispatcher } from './event-dispatcher.service';
import { EventRegistry } from './event-registry.service';
import { EventMetadataUtil } from './event-metadata.util';
import { TenantContextService } from '../../database/context/tenant-context.service';

@Injectable()
export class EventBus {
  constructor(
    private readonly dispatcher: EventDispatcher,
    private readonly registry: EventRegistry,
    private readonly tenantContext: TenantContextService,
  ) {}

  async emit(event: IEvent): Promise<void> {
    // B2.7 — Multi-tenancy support: stamp tenant/actor/correlation
    // context onto the event (only filling gaps the caller didn't
    // already set) before it reaches any handler, so handlers can rely
    // on tenantId being present rather than each re-deriving it.
    EventMetadataUtil.enrichFromContext(event, this.tenantContext);
    await this.dispatcher.dispatch(event);
  }

  /** B2.7 — emits several events in occurredAt order; used by TransactionalEventPublisher after a commit. */
  async emitMany(events: IEvent[]): Promise<void> {
    for (const event of events) {
      await this.emit(event);
    }
  }

  subscribe<T extends IEvent>(eventName: string, handler: IEventHandler<T>): void {
    this.registry.register(eventName, handler as IEventHandler<IEvent>);
  }

  unsubscribe<T extends IEvent>(eventName: string, handler: IEventHandler<T>): void {
    this.registry.unregister(eventName, handler as IEventHandler<IEvent>);
  }

  /** B2.7 — Broadcast: handler runs for every event dispatched through the bus. */
  subscribeGlobal(handler: IEventHandler<IEvent>): void {
    this.registry.registerGlobal(handler);
  }
}
