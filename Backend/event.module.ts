import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { EventBus } from './event-bus.service';
import { EventDispatcher } from './event-dispatcher.service';
import { EventRegistry } from './event-registry.service';
import { EventMiddlewareChain } from './event.middleware';
import { EventPublisher } from './event-publisher.service';
import { EventSubscriberExplorer } from './event-subscriber.explorer';

// B2.7 additions
import { EventStoreService } from './event-store.service';
import { EventReplayGuard } from './event-replay-guard.service';
import { EventMiddlewareRegistrar } from './event-middleware.registrar';
import { EventHandlerRegistrar } from './event-handler.registrar';
import { PersistAllEventsSubscriber } from './persist-all-events.subscriber';
import { NotificationDispatchHandler } from './notification-dispatch.handler';
import { AuditEventPublisher } from './audit-event.publisher';
import { TransactionalEventPublisher } from './transactional-event.publisher';
import { EventOutboxProcessorService } from './event-outbox-processor.service';

/**
 * B2.7 — extends the B1.3 EventModule in place rather than introducing
 * a second event module. Provider registration order matters only for
 * readability here (Nest resolves the DI graph regardless of listed
 * order); the OnModuleInit registrars (EventMiddlewareRegistrar,
 * EventHandlerRegistrar) run after every provider in this module has
 * been constructed, so it's safe for them to depend on anything above.
 */
@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [
    // B1.3 — event bus core
    EventBus,
    EventDispatcher,
    EventRegistry,
    EventMiddlewareChain,
    EventPublisher,
    EventSubscriberExplorer,

    // B2.7 — event store, replay protection, transactional outbox
    EventStoreService,
    EventReplayGuard,
    TransactionalEventPublisher,
    EventOutboxProcessorService,

    // B2.7 — notification & audit integration
    AuditEventPublisher,
    PersistAllEventsSubscriber,
    NotificationDispatchHandler,

    // B2.7 — bootstrap-time wiring
    EventMiddlewareRegistrar,
    EventHandlerRegistrar,
  ],
  exports: [
    EventBus,
    EventDispatcher,
    EventRegistry,
    EventMiddlewareChain,
    EventPublisher,
    EventStoreService,
    EventReplayGuard,
    TransactionalEventPublisher,
    AuditEventPublisher,
  ],
})
export class EventModule {}
