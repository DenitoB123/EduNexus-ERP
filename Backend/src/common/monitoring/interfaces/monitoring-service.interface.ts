import { AggregateHealthReport, HealthCheckCategory } from '../../health/interfaces/health-checker.interface';
import { MetricsSnapshot } from '../../metrics/metrics-registry.service';
import { DiagnosticsReport } from '../../diagnostics/interfaces/diagnostics.interface';
import { Alert } from '../../alerts/interfaces/alert.interface';
import { Span } from '../../tracing/interfaces/tracer.interface';

export interface MonitoringDashboardSnapshot {
  health: AggregateHealthReport;
  metrics: MetricsSnapshot;
  recentAlerts: Alert[];
  recentSpans: Span[];
  generatedAt: string;
}

export interface IMonitoringService {
  getDashboardSnapshot(): Promise<MonitoringDashboardSnapshot>;
  getHealth(category: HealthCheckCategory): Promise<AggregateHealthReport>;
  getMetrics(): MetricsSnapshot;
  getDiagnostics(): Promise<DiagnosticsReport>;
  getRecentAlerts(): Alert[];
}
