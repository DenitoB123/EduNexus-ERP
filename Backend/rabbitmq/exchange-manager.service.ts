import { Injectable } from '@nestjs/common';
import type { ConfirmChannel } from 'amqplib';
import { RabbitMQService } from './rabbitmq.service';

@Injectable()
export class ExchangeManager {
  private readonly declaredExchanges = new Set<string>();

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async assertTopicExchange(name: string): Promise<void> {
    if (this.declaredExchanges.has(name)) return;

    await this.rabbitMQService.getChannelWrapper().addSetup(async (channel: ConfirmChannel) => {
      await channel.assertExchange(name, 'topic', { durable: true });
    });

    this.declaredExchanges.add(name);
  }

  listDeclared(): string[] {
    return Array.from(this.declaredExchanges);
  }
}
