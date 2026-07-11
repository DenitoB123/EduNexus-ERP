import { Injectable } from '@nestjs/common';
import { IEvent, IEventPublisher } from '../interfaces/event.interface';
import { IntegrationEvent } from './event.base';
import { PublisherService } from '../rabbitmq/publisher.service';
import { AppConfigService } from '../../config/app-config.service';

/**
 * B2.7 — implements the IEventPublisher infrastructure interface so
 * future modules can depend on the interface rather than this concrete
 * class. Behavior is unchanged from B1.3: only IntegrationEvent
 * instances are meaningful to publish cross-service via RabbitMQ; any
 * other IEvent passed in is a no-op (logged) rather than an error,
 * since callers may reasonably pass through a generic IEvent without
 * checking its runtime type first.
 */
@Injectable()
export class EventPublisher implements IEventPublisher {
  constructor(
    private readonly publisherService: PublisherService,
    private readonly configService: AppConfigService,
  ) {}

  async publish(event: IEvent): Promise<void> {
    if (!(event instanceof IntegrationEvent)) {
      return;
    }

    const routingKey = `${this.configService.rabbitmq.queuePrefix}.events.${event.eventName}`;
    await this.publisherService.publishToDefault(routingKey, event, event.correlationId);
  }
}
