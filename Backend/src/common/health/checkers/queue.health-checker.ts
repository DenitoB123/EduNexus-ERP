import { Injectable } from '@nestjs/common';
import { RabbitMQService } from '../../../infrastructure/rabbitmq/rabbitmq.service';
import { QueueRegistry } from '../../../infrastructure/rabbitmq/queue-registry.service';
import { QueueMonitoringService } from '../../../infrastructure/jobs/queue-monitoring.service';
import { HealthCheckCategory, HealthCheckResult, IHealthChecker } from '../interfaces/health-checker.interface';
import { timedCheck } from './timed-check.util';

@Injectable()
export class QueueHealthChecker implements IHealthChecker {
  readonly name = 'queue';
  readonly categories: HealthCheckCategory[] = ['readiness', 'startup', 'dependency'];

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly queueRegistry: QueueRegistry,
    private readonly queueMonitoringService: QueueMonitoringService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    return timedCheck(this.name, async () => {
      const healthy = this.rabbitMQService.isHealthy();
      const snapshot = this.queueMonitoringService.getSnapshot();

      return {
        state: healthy ? 'up' : 'down',
        message: healthy ? undefined : 'Broker connection is not established',
        details: { declaredQueues: this.queueRegistry.list().length, ...snapshot },
      };
    });
  }
}
