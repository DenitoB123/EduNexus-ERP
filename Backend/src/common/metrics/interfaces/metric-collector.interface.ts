/**
 * IMetricCollector is a read-side contract: `getSnapshot()` returns
 * a plain object suitable for JSON serialization on a dashboard
 * endpoint. Write-side APIs (recordQuery, recordRateLimitExceeded,
 * etc.) stay specific to each collector — a single generic `record()`
 * would lose the meaningful parameter shapes those already-existing
 * services (DatabaseMetricsService, ApiMetricsService, SecurityMetrics,
 * QueueMonitoringService, PerformanceMonitoringService) were built
 * with, so this module does not force them through one interface
 * retroactively. Instead MetricsRegistryService (metrics-registry.service.ts)
 * composes their existing getSnapshot() methods plus this module's
 * new collectors into one IMetricCollector for the dashboard.
 */
export interface IMetricCollector<TSnapshot = Record<string, unknown>> {
  readonly name: string;
  getSnapshot(): TSnapshot;
}

export const METRIC_COLLECTORS = 'METRIC_COLLECTORS';
