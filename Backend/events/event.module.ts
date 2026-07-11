import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { EventBus } from './event-bus.service';
import { EventDispatcher } from './event-dispatcher.service';
import { EventRegistry } from './event-registry.service';
import { EventMiddlewareChain } from './event.middleware';
import { EventPublisher } from './event-publisher.service';
import { EventSubscriberExplorer } from './event-subscriber.explorer';

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [
    EventBus,
    EventDispatcher,
    EventRegistry,
    EventMiddlewareChain,
    EventPublisher,
    EventSubscriberExplorer,
  ],
  exports: [EventBus, EventDispatcher, EventRegistry, EventMiddlewareChain, EventPublisher],
})
export class EventModule {}
