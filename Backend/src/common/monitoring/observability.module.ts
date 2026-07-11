import { Global, Module } from '@nestjs/common';

// Health
import { HealthAggregatorService } from '../health/health-aggregator.service';
import { HEALTH_CHECKERS } from '../health/interfaces/health-checker.interface';
import { DatabaseHealthChecker } from '../health/checkers/database.health-checker';
import { RedisHealthChecker } from '../health/checkers/redis.health-checker';
import { CacheHealthChecker } from '../health/checkers/cache.health-checker';
import { QueueHealthChecker } from '../health/checkers/queue.health-checker';
import { StorageHealthChecker } from '../health/checkers/storage.health-checker';
import { SystemHealthChecker } from '../health/checkers/system.health-checker';
import { ExternalServiceHealthChecker, EXTERNAL_SERVICE_PROBES } from '../health/checkers/external-service.health-checker';

// Metrics
import { MetricsRegistryService } from '../metrics/metrics-registry.service';
import { SystemResourceMetricsService } from '../metrics/collectors/system-resource.metrics.service';
import { ActiveConnectionsMetricsService } from '../metrics/collectors/active-connections.metrics.service';
import { ActiveConnectionsInterceptor } from '../metrics/collectors/active-connections.interceptor';
import { CacheMetricsService } from '../metrics/collectors/cache.metrics.service';
import { EventBusMetricsService } from '../metrics/collectors/event-bus.metrics.service';
import { CustomMetricsCollector } from '../metrics/collectors/custom-metrics.collector';

// Tracing
import { TracerService } from '../tracing/tracer.service';

// Diagnostics
import { DiagnosticsService } from '../diagnostics/diagnostics.service';
import { DiagnosticsCaptureInterceptor } from '../diagnostics/diagnostics-capture.interceptor';

// Alerts
import { AlertService } from '../alerts/alert.service';
import { AlertRulesRegistrar } from '../alerts/alert-rules.registrar';
import { LogAlertChannel } from '../alerts/channels/log-alert.channel';
import { ALERT_CHANNELS } from '../alerts/interfaces/alert.interface';

// Facade + bootstrap
import { MonitoringService } from './monitoring.service';
import { ObservabilityBootstrap } from './observability-bootstrap.service';
import { MonitoringController } from './monitoring.controller';

/**
 * @Global() so every business module (B3 onward, per the B2.16
 * objective) can inject MonitoringService, TracerService,
 * DiagnosticsService, AlertService, or any individual health
 * checker/metrics collector without re-importing this module,
 * mirroring how SecurityModule/EventModule/CacheModule etc. are
 * already wired in app.module.ts.
 *
 * Registration required at B2.21: add ObservabilityModule to
 * AppModule.imports. Optionally also add ActiveConnectionsInterceptor
 * and DiagnosticsCaptureInterceptor to the global APP_INTERCEPTOR
 * list alongside the existing ones (see
 * IMPLEMENTATION_SUMMARY_B2_16.md §5) — left out of app.module.ts
 * itself since this milestone does not modify foundation files.
 */
@Global()
@Module({
  controllers: [MonitoringController],
  providers: [
    // Health checkers
    DatabaseHealthChecker,
    RedisHealthChecker,
    CacheHealthChecker,
    QueueHealthChecker,
    StorageHealthChecker,
    SystemHealthChecker,
    ExternalServiceHealthChecker,
    { provide: EXTERNAL_SERVICE_PROBES, useValue: [] },
    {
      provide: HEALTH_CHECKERS,
      useFactory: (
        database: DatabaseHealthChecker,
        redis: RedisHealthChecker,
        cache: CacheHealthChecker,
        queue: QueueHealthChecker,
        storage: StorageHealthChecker,
        system: SystemHealthChecker,
        external: ExternalServiceHealthChecker,
      ) => [database, redis, cache, queue, storage, system, external],
      inject: [
        DatabaseHealthChecker,
        RedisHealthChecker,
        CacheHealthChecker,
        QueueHealthChecker,
        StorageHealthChecker,
        SystemHealthChecker,
        ExternalServiceHealthChecker,
      ],
    },
    HealthAggregatorService,

    // Metrics
    SystemResourceMetricsService,
    ActiveConnectionsMetricsService,
    ActiveConnectionsInterceptor,
    CacheMetricsService,
    EventBusMetricsService,
    CustomMetricsCollector,
    MetricsRegistryService,

    // Tracing
    TracerService,

    // Diagnostics
    DiagnosticsService,
    DiagnosticsCaptureInterceptor,

    // Alerts
    LogAlertChannel,
    { provide: ALERT_CHANNELS, useFactory: (log: LogAlertChannel) => [log], inject: [LogAlertChannel] },
    AlertService,
    AlertRulesRegistrar,

    // Facade
    MonitoringService,
    ObservabilityBootstrap,
  ],
  exports: [
    HealthAggregatorService,
    MetricsRegistryService,
    TracerService,
    DiagnosticsService,
    AlertService,
    MonitoringService,
    CustomMetricsCollector,
    ActiveConnectionsInterceptor,
    DiagnosticsCaptureInterceptor,
  ],
})
export class ObservabilityModule {}
