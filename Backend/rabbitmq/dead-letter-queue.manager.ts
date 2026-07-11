import { Injectable } from '@nestjs/common';
import type { ConfirmChannel } from 'amqplib';
import { RabbitMQService } from './rabbitmq.service';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class DeadLetterQueueManager {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly configService: AppConfigService,
  ) {}

  async provisionFor(queueName: string, routingKey: string): Promise<{ dlxName: string; dlqName: string }> {
    const { exchange } = this.configService.rabbitmq;
    const dlxName = `${exchange}.dlx`;
    const dlqName = `${queueName}.dlq`;

    await this.rabbitMQService.getChannelWrapper().addSetup(async (channel: ConfirmChannel) => {
      await channel.assertExchange(dlxName, 'topic', { durable: true });
      await channel.assertQueue(dlqName, { durable: true });
      await channel.bindQueue(dlqName, dlxName, routingKey);
    });

    return { dlxName, dlqName };
  }
}
