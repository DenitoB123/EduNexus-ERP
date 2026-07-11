import { Global, Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { ExchangeManager } from './exchange-manager.service';
import { QueueManager } from './queue-manager.service';
import { QueueRegistry } from './queue-registry.service';
import { DeadLetterQueueManager } from './dead-letter-queue.manager';
import { PublisherService } from './publisher.service';
import { ConsumerService } from './consumer.service';

@Global()
@Module({
  providers: [
    RabbitMQService,
    ExchangeManager,
    QueueManager,
    QueueRegistry,
    DeadLetterQueueManager,
    PublisherService,
    ConsumerService,
  ],
  exports: [
    RabbitMQService,
    ExchangeManager,
    QueueManager,
    QueueRegistry,
    DeadLetterQueueManager,
    PublisherService,
    ConsumerService,
  ],
})
export class RabbitMQModule {}
