import { Injectable } from '@nestjs/common';
import type { ConfirmChannel, Message } from 'amqplib';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { AppConfigService } from '../../config/app-config.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { JOBS_QUEUE_NAME, JOBS_ROUTING_KEY } from './job.constants';

@Injectable()
export class FailedJobRecoveryService {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly configService: AppConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('FailedJobRecoveryService');
  }

  /**
   * Pulls up to `limit` messages off the jobs dead-letter queue and
   * republishes each one to the live jobs exchange for reprocessing.
   */
  async replayFromDeadLetter(limit = 50): Promise<number> {
    const dlqName = `${JOBS_QUEUE_NAME}.dlq`;
    const { exchange } = this.configService.rabbitmq;
    let replayed = 0;

    await this.rabbitMQService.getChannelWrapper().addSetup(async (channel: ConfirmChannel) => {
      for (let i = 0; i < limit; i += 1) {
        const msg: Message | false = await channel.get(dlqName, { noAck: false });
        if (!msg) break;

        await channel.publish(exchange, JOBS_ROUTING_KEY, msg.content, { persistent: true });
        channel.ack(msg);
        replayed += 1;
      }
    });

    this.logger.log(`Replayed ${replayed} message(s) from "${dlqName}" back to the live queue`);
    return replayed;
  }
}
