import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import type { ChannelWrapper, AmqpConnectionManager } from 'amqp-connection-manager';
import type { ConfirmChannel } from 'amqplib';
import { AppConfigService } from '../../config/app-config.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection!: AmqpConnectionManager;
  private channelWrapper!: ChannelWrapper;
  private isConnected = false;

  constructor(
    private readonly configService: AppConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('RabbitMQService');
  }

  async onModuleInit(): Promise<void> {
    const { url, exchange, queuePrefix, reconnectTimeMs, heartbeatSec } =
      this.configService.rabbitmq;

    this.connection = amqp.connect([url], {
      heartbeatIntervalInSeconds: heartbeatSec,
      reconnectTimeInSeconds: Math.round(reconnectTimeMs / 1000),
    });

    this.connection.on('connect', () => {
      this.isConnected = true;
      this.logger.log('RabbitMQ connection established');
    });

    this.connection.on('disconnect', ({ err }: { err: Error }) => {
      this.isConnected = false;
      this.logger.warn(`RabbitMQ disconnected: ${err?.message ?? 'unknown reason'}`);
    });

    this.connection.on('connectFailed', ({ err }: { err: Error }) => {
      this.isConnected = false;
      this.logger.error(`RabbitMQ connection failed: ${err?.message}`, err?.stack);
    });

    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        await channel.assertExchange(exchange, 'topic', { durable: true });

        const deadLetterExchange = `${exchange}.dlx`;
        await channel.assertExchange(deadLetterExchange, 'topic', { durable: true });

        const defaultQueue = `${queuePrefix}.default`;
        await channel.assertQueue(defaultQueue, {
          durable: true,
          deadLetterExchange,
        });
        await channel.bindQueue(defaultQueue, exchange, `${queuePrefix}.#`);

        const dlqQueue = `${queuePrefix}.default.dlq`;
        await channel.assertQueue(dlqQueue, { durable: true });
        await channel.bindQueue(dlqQueue, deadLetterExchange, `${queuePrefix}.#`);
      },
    });

    await this.channelWrapper.waitForConnect();
    this.logger.log('RabbitMQ exchanges and queues provisioned');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channelWrapper) {
      await this.channelWrapper.close();
    }
    if (this.connection) {
      await this.connection.close();
      this.logger.log('RabbitMQ connection gracefully closed');
    }
  }

  async publish(routingKey: string, payload: Record<string, unknown>): Promise<boolean> {
    const { exchange } = this.configService.rabbitmq;
    return this.channelWrapper.publish(exchange, routingKey, payload, { persistent: true });
  }

  getChannelWrapper(): ChannelWrapper {
    return this.channelWrapper;
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}
