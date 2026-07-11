import { Injectable } from '@nestjs/common';
import { DatabaseMetricsService } from '../../database/monitoring/database-metrics.service';
import { ApiMetricsService } from '../../api/monitoring/api-metrics.service';
import { PerformanceMonitoringService } from '../../infrastructure/monitoring/performance-monitoring.service';
import { QueueMonitoringService } from '../../infrastructure/jobs/queue-monitoring.service';
import { SecurityMetrics } from '../../security/monitoring/security-metrics.service';
import { SystemResourceMetricsService } from './collectors/system-resource.metrics.service';
import { ActiveConnectionsMetricsService } from './collectors/active-connections.metrics.service';
import { CacheMetricsService } from './collectors/cache.metrics.service';
import { EventBusMetricsService } from './collectors/event-bus.metrics.service';

export interface MetricsSnapshot {
  requestCount: ReturnType<ApiMetricsService['getSnapshot']>;
  responseTime: ReturnType<PerformanceMonitoringService['getSnapshot']>;
  database: ReturnType<DatabaseMetricsService['getSnapshot']>;
  queue: ReturnType<QueueMonitoringService['getSnapshot']>;
  cache: ReturnType<CacheMetricsService['getSnapshot']>;
  eventBus: ReturnType<EventBusMetricsService['getSnapshot']>;
  security: ReturnType<SecurityMetrics['getSnapshot']>;
  system: ReturnType<SystemResourceMetricsService['getSnapshot']>;
  connections: ReturnType<ActiveConnectionsMetricsService['getSnapshot']>;
  generatedAt: string;
}

/**
 * Single composition point over every metrics source in the
 * project — the five that already existed in B2.2
 * (DatabaseMetricsService, ApiMetricsService,
 * PerformanceMonitoringService, QueueMonitoringService,
 * SecurityMetrics) plus the four genuinely new B2.16 collectors
 * (system resources, active connections, cache, event bus). No
 * metric-producing logic is duplicated here — this only calls
 * `getSnapshot()` on each and reshapes the result for the dashboard
 * (see MonitoringService / monitoring.controller.ts).
 *
 * "Request Count" and "Response Time" are each backed by two
 * pre-existing, slightly different collectors (ApiMetricsService
 * tracks error rate per endpoint; PerformanceMonitoringService
 * tracks max/avg duration per endpoint). Both are exposed rather
 * than picking one, since consolidating them would mean editing
 * B2.2 files this milestone must not touch.
 */
@Injectable()
export class MetricsRegistryService {
  constructor(
    private readonly databaseMetricsService: DatabaseMetricsService,
    private readonly apiMetricsService: ApiMetricsService,
    private readonly performanceMonitoringService: PerformanceMonitoringService,
    private readonly queueMonitoringService: QueueMonitoringService,
    private readonly securityMetrics: SecurityMetrics,
    private readonly systemResourceMetricsService: SystemResourceMetricsService,
    private readonly activeConnectionsMetricsService: ActiveConnectionsMetricsService,
    private readonly cacheMetricsService: CacheMetricsService,
    private readonly eventBusMetricsService: EventBusMetricsService,
  ) {}

  getSnapshot(): MetricsSnapshot {
    return {
      requestCount: this.apiMetricsService.getSnapshot(),
      responseTime: this.performanceMonitoringService.getSnapshot(),
      database: this.databaseMetricsService.getSnapshot(),
      queue: this.queueMonitoringService.getSnapshot(),
      cache: this.cacheMetricsService.getSnapshot(),
      eventBus: this.eventBusMetricsService.getSnapshot(),
      security: this.securityMetrics.getSnapshot(),
      system: this.systemResourceMetricsService.getSnapshot(),
      connections: this.activeConnectionsMetricsService.getSnapshot(),
      generatedAt: new Date().toISOString(),
    };
  }

  /** Computed error rate across all endpoints — used by AlertingService's high-error-rate rule. */
  getOverallErrorRate(): number {
    const endpoints = Object.values(this.apiMetricsService.getSnapshot());
    if (endpoints.length === 0) return 0;

    const totalRequests = endpoints.reduce((sum, e) => sum + e.requests, 0);
    const totalErrors = endpoints.reduce((sum, e) => sum + e.errors, 0);
    return totalRequests > 0 ? totalErrors / totalRequests : 0;
  }
}
