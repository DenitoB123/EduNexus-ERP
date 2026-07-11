import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { QueueRegistry } from '../rabbitmq/queue-registry.service';

@Injectable()
export class QueueHealthIndicator {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly queueRegistry: QueueRegistry,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  check(key: string): HealthIndicatorResult {
    const indicator = this.healthIndicatorService.check(key);

    if (!this.rabbitMQService.isHealthy()) {
      return indicator.down({ message: 'Broker connection is not established' });
    }

    return indicator.up({ declaredQueues: this.queueRegistry.list().length });
  }
}
