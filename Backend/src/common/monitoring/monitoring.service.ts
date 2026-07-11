import { Injectable } from '@nestjs/common';
import { HealthAggregatorService } from '../health/health-aggregator.service';
import { MetricsRegistryService, MetricsSnapshot } from '../metrics/metrics-registry.service';
import { DiagnosticsService } from '../diagnostics/diagnostics.service';
import { AlertService } from '../alerts/alert.service';
import { TracerService } from '../tracing/tracer.service';
import { AggregateHealthReport, HealthCheckCategory } from '../health/interfaces/health-checker.interface';
import { DiagnosticsReport } from '../diagnostics/interfaces/diagnostics.interface';
import { Alert } from '../alerts/interfaces/alert.interface';
import { IMonitoringService, MonitoringDashboardSnapshot } from './interfaces/monitoring-service.interface';

/**
 * Single facade over the whole framework — this is what a future
 * dashboard (or MonitoringController below) calls instead of
 * depending on five different services directly. Every method
 * delegates; no logic is duplicated here.
 */
@Injectable()
export class MonitoringService implements IMonitoringService {
  constructor(
    private readonly healthAggregatorService: HealthAggregatorService,
    private readonly metricsRegistryService: MetricsRegistryService,
    private readonly diagnosticsService: DiagnosticsService,
    private readonly alertService: AlertService,
    private readonly tracerService: TracerService,
  ) {}

  async getDashboardSnapshot(): Promise<MonitoringDashboardSnapshot> {
    const health = await this.healthAggregatorService.checkCategory('readiness');

    return {
      health,
      metrics: this.metricsRegistryService.getSnapshot(),
      recentAlerts: this.alertService.getRecentAlerts(),
      recentSpans: this.tracerService.getRecentSpans(),
      generatedAt: new Date().toISOString(),
    };
  }

  async getHealth(category: HealthCheckCategory): Promise<AggregateHealthReport> {
    return this.healthAggregatorService.checkCategory(category);
  }

  getMetrics(): MetricsSnapshot {
    return this.metricsRegistryService.getSnapshot();
  }

  async getDiagnostics(): Promise<DiagnosticsReport> {
    return this.diagnosticsService.runFullDiagnostics();
  }

  getRecentAlerts(): Alert[] {
    return this.alertService.getRecentAlerts();
  }
}
