import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { AppLoggerService } from '../logger/app-logger.service';
import { PrismaHealthIndicator } from '../../health/indicators/prisma-health.indicator';
import { RedisHealthIndicator } from '../../health/indicators/redis-health.indicator';
import { RabbitMQHealthIndicator } from '../../health/indicators/rabbitmq-health.indicator';
import { QueueHealthIndicator } from '../../infrastructure/monitoring/queue-health.indicator';
import { StorageHealthIndicator } from '../../infrastructure/monitoring/storage-health.indicator';
import {
  IStartupVerifier,
  StartupCheckResult,
  StartupVerificationReport,
} from '../interfaces/startup-verifier.interface';

interface CheckDefinition {
  name: string;
  critical: boolean;
  run: () => HealthIndicatorResult | Promise<HealthIndicatorResult>;
}

/**
 * Runs every critical downstream dependency check once at boot and
 * produces a single report, logged by BootstrapDiagnosticsService.
 * Deliberately reuses the exact same indicators the /health/ready
 * endpoint uses (PrismaHealthIndicator, RedisHealthIndicator,
 * RabbitMQHealthIndicator, QueueHealthIndicator, StorageHealthIndicator)
 * so "is the app ready" and "was the app ready at boot" can never
 * silently disagree — there is exactly one connectivity-check
 * implementation per dependency, this class just orchestrates when
 * they're called.
 */
@Injectable()
export class StartupVerifierService implements IStartupVerifier {
  constructor(
    private readonly prismaHealthIndicator: PrismaHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator,
    private readonly rabbitMQHealthIndicator: RabbitMQHealthIndicator,
    private readonly queueHealthIndicator: QueueHealthIndicator,
    private readonly storageHealthIndicator: StorageHealthIndicator,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('StartupVerifierService');
  }

  private checks(): CheckDefinition[] {
    return [
      { name: 'database', critical: true, run: () => this.prismaHealthIndicator.check('database') },
      { name: 'redis', critical: true, run: () => this.redisHealthIndicator.check('redis') },
      { name: 'rabbitmq', critical: true, run: () => this.rabbitMQHealthIndicator.check('rabbitmq') },
      { name: 'queue', critical: false, run: () => this.queueHealthIndicator.check('queue') },
      { name: 'storage', critical: false, run: () => this.storageHealthIndicator.check('storage') },
    ];
  }

  async verify(): Promise<StartupVerificationReport> {
    const startedAt = new Date();
    const results: StartupCheckResult[] = [];

    for (const check of this.checks()) {
      const checkStartedAt = Date.now();
      try {
        const result = await check.run();
        const status = result[check.name]?.status === 'up' ? 'up' : 'down';
        results.push({
          name: check.name,
          status,
          critical: check.critical,
          durationMs: Date.now() - checkStartedAt,
        });
      } catch (error) {
        results.push({
          name: check.name,
          status: 'down',
          critical: check.critical,
          durationMs: Date.now() - checkStartedAt,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const completedAt = new Date();
    const healthy = results.every((r) => r.status === 'up' || !r.critical);

    for (const result of results) {
      const line = `Startup check "${result.name}": ${result.status} (${result.durationMs}ms)${result.error ? ` — ${result.error}` : ''}`;
      if (result.status === 'down' && result.critical) {
        this.logger.error(line);
      } else if (result.status === 'down') {
        this.logger.warn(line);
      } else {
        this.logger.log(line);
      }
    }

    return { healthy, checks: results, startedAt, completedAt };
  }
}
