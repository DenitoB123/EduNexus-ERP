import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service';

@Injectable()
export class RabbitMQHealthIndicator {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  check(key: string): HealthIndicatorResult {
    const indicator = this.healthIndicatorService.check(key);
    const isHealthy = this.rabbitMQService.isHealthy();

    if (!isHealthy) {
      return indicator.down({ message: 'RabbitMQ connection is not established' });
    }

    return indicator.up();
  }
}
