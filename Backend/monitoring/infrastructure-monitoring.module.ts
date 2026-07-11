import { Global, Module } from '@nestjs/common';
import { RequestContextService } from './request-context.service';
import { RequestContextMiddleware } from './request-context.middleware';
import { QueueHealthIndicator } from './queue-health.indicator';
import { StorageHealthIndicator } from './storage-health.indicator';
import { InfrastructureMetricsService } from './infrastructure-metrics.service';
import { PerformanceMonitoringService } from './performance-monitoring.service';
import { PerformanceMonitoringInterceptor } from './performance-monitoring.interceptor';

@Global()
@Module({
  providers: [
    RequestContextService,
    RequestContextMiddleware,
    QueueHealthIndicator,
    StorageHealthIndicator,
    InfrastructureMetricsService,
    PerformanceMonitoringService,
    PerformanceMonitoringInterceptor,
  ],
  exports: [
    RequestContextService,
    RequestContextMiddleware,
    QueueHealthIndicator,
    StorageHealthIndicator,
    InfrastructureMetricsService,
    PerformanceMonitoringService,
    PerformanceMonitoringInterceptor,
  ],
})
export class InfrastructureMonitoringModule {}
