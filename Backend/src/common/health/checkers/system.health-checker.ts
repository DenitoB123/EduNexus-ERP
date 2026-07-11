import { Injectable } from '@nestjs/common';
import { HealthCheckCategory, HealthCheckResult, IHealthChecker } from '../interfaces/health-checker.interface';
import { timedCheck } from './timed-check.util';

const HEAP_LIMIT_BYTES = 300 * 1024 * 1024;
const RSS_LIMIT_BYTES = 500 * 1024 * 1024;

/**
 * Process-level liveness signal — deliberately has no external
 * dependencies (no DB/Redis/broker calls) so it stays accurate even
 * when those are down, which is the whole point of a liveness probe
 * (mirrors the existing memory checks in src/health/health.controller.ts's
 * `checkLiveness`, expressed as an IHealthChecker so it also
 * participates in the unified MonitoringService snapshot).
 */
@Injectable()
export class SystemHealthChecker implements IHealthChecker {
  readonly name = 'system';
  readonly categories: HealthCheckCategory[] = ['liveness', 'startup'];

  async check(): Promise<HealthCheckResult> {
    return timedCheck(this.name, async () => {
      const usage = process.memoryUsage();
      const overHeap = usage.heapUsed > HEAP_LIMIT_BYTES;
      const overRss = usage.rss > RSS_LIMIT_BYTES;

      return {
        state: overHeap || overRss ? 'degraded' : 'up',
        message: overHeap || overRss ? 'Process memory usage exceeds configured thresholds' : undefined,
        details: {
          uptimeSeconds: Math.round(process.uptime()),
          heapUsedMb: Math.round(usage.heapUsed / 1024 / 1024),
          rssMb: Math.round(usage.rss / 1024 / 1024),
          pid: process.pid,
          nodeVersion: process.version,
        },
      };
    });
  }
}
