import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { EventBus } from './event-bus.service';
import { ON_EVENT_METADATA_KEY } from './event-subscriber.decorator';
import { IEvent } from '../interfaces/event.interface';
import { AppLoggerService } from '../../common/logger/app-logger.service';

@Injectable()
export class EventSubscriberExplorer implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly eventBus: EventBus,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('EventSubscriberExplorer');
  }

  onModuleInit(): void {
    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      const { instance } = wrapper;
      if (!instance || typeof instance !== 'object') continue;

      const prototype = Object.getPrototypeOf(instance);
      if (!prototype) continue;

      const methodNames = this.metadataScanner.getAllMethodNames(prototype);

      for (const methodName of methodNames) {
        const eventName = this.reflector.get<string | undefined>(
          ON_EVENT_METADATA_KEY,
          instance[methodName],
        );

        if (!eventName) continue;

        this.eventBus.subscribe(eventName, {
          handle: async (event: IEvent) => {
            await (instance[methodName] as (event: IEvent) => Promise<void>).call(instance, event);
          },
        });

        this.logger.log(`Registered "${methodName}" as handler for event "${eventName}"`);
      }
    }
  }
}
