import { Injectable } from '@nestjs/common';
import type { ConfirmChannel } from 'amqplib';
import { RabbitMQService } from './rabbitmq.service';
import { ExchangeManager } from './exchange-manager.service';
import { DeadLetterQueueManager } from './dead-letter-queue.manager';
import { QueueRegistry } from './queue-registry.service';
import { QueueDefinition, DEFAULT_QUEUE_OPTIONS } from './queue.config';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class QueueManager {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly exchangeManager: ExchangeManager,
    private readonly deadLetterQueueManager: DeadLetterQueueManager,
    private readonly queueRegistry: QueueRegistry,
    private readonly configService: AppConfigService,
  ) {}

  async declare(definition: QueueDefinition): Promise<void> {
    const { exchange } = this.configService.rabbitmq;
    const options = { ...DEFAULT_QUEUE_OPTIONS, ...definition };

    await this.exchangeManager.assertTopicExchange(exchange);
    const { dlxName } = await this.deadLetterQueueManager.provisionFor(
      definition.name,
      definition.routingKey,
    );

    await this.rabbitMQService.getChannelWrapper().addSetup(async (channel: ConfirmChannel) => {
      await channel.assertQueue(definition.name, {
        durable: options.durable,
        deadLetterExchange: dlxName,
      });
      await channel.bindQueue(definition.name, exchange, definition.routingKey);
    });

    this.queueRegistry.register(options);
  }
}
