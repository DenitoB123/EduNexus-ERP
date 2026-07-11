import { Injectable } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { MessageSerializer } from './message-serializer';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { AppConfigService } from '../../config/app-config.service';
import { IPublisher } from '../interfaces/queue.interface';

@Injectable()
export class PublisherService implements IPublisher {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly configService: AppConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('PublisherService');
  }

  async publish<T>(
    exchange: string,
    routingKey: string,
    payload: T,
    correlationId?: string,
  ): Promise<void> {
    const message = MessageSerializer.wrap(payload, correlationId);
    const channel = this.rabbitMQService.getChannelWrapper();

    await channel.publish(exchange, routingKey, message, {
      persistent: true,
      messageId: message.id,
      correlationId: message.correlationId,
    });

    this.logger.debug(`Published message ${message.id} to ${exchange}/${routingKey}`);
  }

  async publishToDefault<T>(routingKey: string, payload: T, correlationId?: string): Promise<void> {
    await this.publish(this.configService.rabbitmq.exchange, routingKey, payload, correlationId);
  }
}
