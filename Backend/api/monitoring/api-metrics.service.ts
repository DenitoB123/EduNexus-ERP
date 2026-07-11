import { Injectable } from '@nestjs/common';

export interface EndpointMetric {
  requests: number;
  errors: number;
  totalDurationMs: number;
  maxDurationMs: number;
  lastCalledAt: Date | null;
}

@Injectable()
export class ApiMetricsService {
  private readonly metrics = new Map<string, EndpointMetric>();

  record(endpointKey: string, durationMs: number, isError: boolean): void {
    const existing = this.metrics.get(endpointKey) ?? {
      requests: 0,
      errors: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
      lastCalledAt: null,
    };

    existing.requests += 1;
    if (isError) existing.errors += 1;
    existing.totalDurationMs += durationMs;
    existing.maxDurationMs = Math.max(existing.maxDurationMs, durationMs);
    existing.lastCalledAt = new Date();

    this.metrics.set(endpointKey, existing);
  }

  getSnapshot(): Record<string, EndpointMetric & { averageDurationMs: number; errorRate: number }> {
    const snapshot: Record<string, EndpointMetric & { averageDurationMs: number; errorRate: number }> = {};

    for (const [key, metric] of this.metrics.entries()) {
      snapshot[key] = {
        ...metric,
        averageDurationMs: metric.requests > 0 ? metric.totalDurationMs / metric.requests : 0,
        errorRate: metric.requests > 0 ? metric.errors / metric.requests : 0,
      };
    }

    return snapshot;
  }

  reset(): void {
    this.metrics.clear();
  }
}
