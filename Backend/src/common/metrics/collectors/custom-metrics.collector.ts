import { Injectable } from '@nestjs/common';
import { IMetricCollector } from '../interfaces/metric-collector.interface';

export interface CustomMetricStat {
  count: number;
  totalDurationMs: number;
}

export interface CustomMetricsSnapshot {
  [metricName: string]: CustomMetricStat & { averageDurationMs: number };
}

/**
 * Backs @TrackMetric. Storage is static so the decorator (which runs
 * outside DI, at class-definition time — see
 * decorators/observability-context.holder.ts for why) can record
 * directly via `CustomMetricsCollector.record(...)` without needing
 * an injected instance, while this same data is still readable
 * through the normal injectable IMetricCollector interface for the
 * dashboard snapshot.
 */
@Injectable()
export class CustomMetricsCollector implements IMetricCollector<CustomMetricsSnapshot> {
  readonly name = 'custom';
  private static readonly stats = new Map<string, CustomMetricStat>();

  static record(metricName: string, durationMs = 0): void {
    const existing = CustomMetricsCollector.stats.get(metricName) ?? { count: 0, totalDurationMs: 0 };
    existing.count += 1;
    existing.totalDurationMs += durationMs;
    CustomMetricsCollector.stats.set(metricName, existing);
  }

  getSnapshot(): CustomMetricsSnapshot {
    const snapshot: CustomMetricsSnapshot = {};
    for (const [name, stat] of CustomMetricsCollector.stats.entries()) {
      snapshot[name] = { ...stat, averageDurationMs: stat.count > 0 ? stat.totalDurationMs / stat.count : 0 };
    }
    return snapshot;
  }
}
