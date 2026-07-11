import { Injectable } from '@nestjs/common';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { RabbitMQService } from './rabbitmq.service';
import { MessageSerializer } from './message-serializer';
import { MessageValidator } from './message-validator';
import { MessageRetryStrategy } from './retry-strategy';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { IConsumerHandler } from '../interfaces/queue.interface';

export interface ConsumeOptions {
  prefetch?: number;
  maxRetries?: number;
}

@Injectable()
export class ConsumerService {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('ConsumerService');
  }

  async consume<T>(
    queueName: string,
    handler: IConsumerHandler<T>,
    options: ConsumeOptions = {},
  ): Promise<void> {
    const maxRetries = options.maxRetries ?? 5;

    await this.rabbitMQService.getChannelWrapper().addSetup(async (channel: ConfirmChannel) => {
      if (options.prefetch) {
        await channel.prefetch(options.prefetch);
      }

      await channel.consume(queueName, async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        let parsed: ReturnType<typeof MessageSerializer.fromBuffer<T>> | null = null;

        try {
          parsed = MessageSerializer.fromBuffer<T>(msg.content);

          if (!MessageValidator.isValidEnvelope(parsed)) {
            this.logger.error(`Discarding malformed message on queue "${queueName}"`);
            channel.nack(msg, false, false);
            return;
          }

          await handler.handle(parsed);
          channel.ack(msg);
        } catch (error) {
          const attempt = (parsed?.attempt ?? 0) + 1;
          const message = error instanceof Error ? error.message : 'unknown error';

          this.logger.warn(
            `Handler failed for message on "${queueName}" (attempt ${attempt}/${maxRetries}): ${message}`,
          );

          if (MessageRetryStrategy.shouldRetry(attempt, maxRetries)) {
            channel.nack(msg, false, true);
          } else {
            this.logger.error(
              `Exhausted retries for message on "${queueName}"; routing to dead-letter queue`,
            );
            channel.nack(msg, false, false);
          }
        }
      });
    });

    this.logger.log(`Consumer attached to queue "${queueName}"`);
  }
}
