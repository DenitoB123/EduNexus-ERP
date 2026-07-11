import { Prisma } from '@prisma/client';
import { QueryPerformanceLogger } from '../monitoring/query-performance.logger';
import { DatabaseMetricsService } from '../monitoring/database-metrics.service';

export function attachQueryLoggingMiddleware(
  onQuery: (cb: (event: Prisma.QueryEvent) => void) => void,
  performanceLogger: QueryPerformanceLogger,
  metricsService: DatabaseMetricsService,
  slowQueryThresholdMs: number,
): void {
  onQuery((event: Prisma.QueryEvent) => {
    const durationMs = event.duration;
    const isSlow = durationMs >= slowQueryThresholdMs;

    performanceLogger.record({
      query: event.query,
      params: event.params,
      durationMs,
    });

    metricsService.recordQuery(durationMs, isSlow);
  });
}
