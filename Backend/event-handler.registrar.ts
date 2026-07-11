import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus } from './event-bus.service';
import { PersistAllEventsSubscriber } from './persist-all-events.subscriber';
import { NotificationDispatchHandler } from './notification-dispatch.handler';
import { AppLoggerService } from '../../common/logger/app-logger.service';

/**
 * B2.7 — Event Registry: automatic registration for handlers.
 *
 * `EventSubscriberExplorer` (B1.3) already auto-discovers method-level
 * `@OnEvent(name)` decorated handlers on every provider via
 * DiscoveryService — that mechanism is unchanged and still the
 * preferred way for a business module to subscribe.
 *
 * The two handlers below are full classes (implementing IEventHandler
 * directly) rather than a decorated method, because they need several
 * constructor-injected dependencies of their own (EventStoreService;
 * Email/Sms/Push queues + Redis) and are core event-infrastructure
 * pieces rather than business-module subscribers. This registrar wires
 * them onto the bus once, at bootstrap, the same way a business module
 * would via `eventBus.subscribe(...)`.
 */
@Injectable()
export class EventHandlerRegistrar implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBus,
    private readonly persistAllEventsSubscriber: PersistAllEventsSubscriber,
    private readonly notificationDispatchHandler: NotificationDispatchHandler,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('EventHandlerRegistrar');
  }

  onModuleInit(): void {
    this.eventBus.subscribeGlobal(this.persistAllEventsSubscriber);
    this.eventBus.subscribe('notification.requested', this.notificationDispatchHandler);

    this.logger.log(
      'Registered core event handlers (PersistAllEventsSubscriber [global], NotificationDispatchHandler)',
    );
  }
}
