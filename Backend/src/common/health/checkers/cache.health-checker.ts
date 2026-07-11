import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { HealthCheckCategory, HealthCheckResult, IHealthChecker } from '../interfaces/health-checker.interface';
import { timedCheck } from './timed-check.util';

const PROBE_KEY = '__observability_health_probe__';

/**
 * Distinct from RedisHealthChecker: that one confirms the transport
 * connection is alive; this one confirms the caching layer built on
 * top of it (CacheService.set/get, i.e. infrastructure/cache) can
 * actually round-trip a value — catches serialization or TTL
 * misconfiguration that a bare connection ping would miss.
 */
@Injectable()
export class CacheHealthChecker implements IHealthChecker {
  readonly name = 'cache';
  readonly categories: HealthCheckCategory[] = ['readiness', 'dependency'];

  constructor(private readonly cacheService: CacheService) {}

  async check(): Promise<HealthCheckResult> {
    return timedCheck(this.name, async () => {
      const probeValue = Date.now().toString();
      await this.cacheService.set(PROBE_KEY, probeValue, 30);
      const readBack = await this.cacheService.get<string>(PROBE_KEY);

      if (readBack !== probeValue) {
        return { state: 'down', message: 'Cache round-trip (set/get) did not return the written value' };
      }
      return { state: 'up' };
    });
  }
}
