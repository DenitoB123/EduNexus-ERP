import { Injectable } from '@nestjs/common';
import { IntegrationEvent } from './event.base';
import { PublisherService } from '../rabbitmq/publisher.service';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class EventPublisher {
  constructor(
    private readonly publisherService: PublisherService,
    private readonly configService: AppConfigService,
  ) {}

  async publish(event: IntegrationEvent): Promise<void> {
    const routingKey = `${this.configService.rabbitmq.queuePrefix}.events.${event.eventName}`;
    await this.publisherService.publishToDefault(routingKey, event, event.correlationId);
  }
}
