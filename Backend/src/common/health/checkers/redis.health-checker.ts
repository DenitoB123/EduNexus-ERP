import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { HealthCheckCategory, HealthCheckResult, IHealthChecker } from '../interfaces/health-checker.interface';
import { timedCheck } from './timed-check.util';

@Injectable()
export class RedisHealthChecker implements IHealthChecker {
  readonly name = 'redis';
  readonly categories: HealthCheckCategory[] = ['readiness', 'startup', 'dependency'];

  constructor(private readonly redisService: RedisService) {}

  async check(): Promise<HealthCheckResult> {
    return timedCheck(this.name, async () => {
      const healthy = await this.redisService.isHealthy();
      return { state: healthy ? 'up' : 'down', message: healthy ? undefined : 'Redis connection is not responding' };
    });
  }
}
