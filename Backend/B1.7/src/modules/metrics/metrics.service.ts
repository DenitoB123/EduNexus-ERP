import { Injectable } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Gauge,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

/**
 * MetricsService
 * ─────────────────────────────────────────────────────────────────────────────
 * Prometheus metrics — genuinely missing from Milestones 1.1–1.6. The
 * existing ObservabilityModule (1.6) and MonitoringModule (1.5) cover
 * structured logging, request tracing, and a health-style monitoring
 * controller, but none of them expose a Prometheus scrape endpoint or
 * counter/histogram primitives, so this does not duplicate them — it gives
 * them something to plug into.
 *
 * PerformanceInterceptor (1.6, src/modules/observability) can be extended to
 * call `metricsService.observeHttpRequest(...)` without modifying its core
 * responsibility; that wiring is one line in that file, left for the team to
 * apply since "do not modify existing observability" was the brief unless
 * required for integration.
 */
@Injectable()
export class MetricsService {
  public readonly registry: Registry;

  public readonly httpRequestDuration: Histogram<string>;
  public readonly httpRequestsTotal: Counter<string>;
  public readonly queueJobsTotal: Counter<string>;
  public readonly activeQueueJobs: Gauge<string>;
  public readonly cacheHitsTotal: Counter<string>;
  public readonly cacheMissesTotal: Counter<string>;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry, prefix: 'edunexus_' });

    this.httpRequestDuration = new Histogram({
      name: 'edunexus_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpRequestsTotal = new Counter({
      name: 'edunexus_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.queueJobsTotal = new Counter({
      name: 'edunexus_queue_jobs_total',
      help: 'Total Bull queue jobs processed, by queue and outcome',
      labelNames: ['queue', 'outcome'],
      registers: [this.registry],
    });

    this.activeQueueJobs = new Gauge({
      name: 'edunexus_queue_jobs_active',
      help: 'Currently active jobs per queue',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.cacheHitsTotal = new Counter({
      name: 'edunexus_cache_hits_total',
      help: 'Cache hits',
      registers: [this.registry],
    });

    this.cacheMissesTotal = new Counter({
      name: 'edunexus_cache_misses_total',
      help: 'Cache misses',
      registers: [this.registry],
    });
  }

  observeHttpRequest(method: string, route: string, statusCode: number, durationSeconds: number): void {
    const labels = { method, route, status_code: String(statusCode) };
    this.httpRequestDuration.observe(labels, durationSeconds);
    this.httpRequestsTotal.inc(labels);
  }

  async getMetricsText(): Promise<string> {
    return this.registry.metrics();
  }
}
