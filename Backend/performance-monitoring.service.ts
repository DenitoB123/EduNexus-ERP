import { Injectable } from '@nestjs/common';

export interface EndpointStat {
  count: number;
  totalDurationMs: number;
  maxDurationMs: number;
}

@Injectable()
export class PerformanceMonitoringService {
  private readonly stats = new Map<string, EndpointStat>();

  record(endpointKey: string, durationMs: number): void {
    const existing = this.stats.get(endpointKey) ?? { count: 0, totalDurationMs: 0, maxDurationMs: 0 };

    existing.count += 1;
    existing.totalDurationMs += durationMs;
    existing.maxDurationMs = Math.max(existing.maxDurationMs, durationMs);

    this.stats.set(endpointKey, existing);
  }

  getSnapshot(): Record<string, EndpointStat & { averageDurationMs: number }> {
    const snapshot: Record<string, EndpointStat & { averageDurationMs: number }> = {};

    for (const [key, stat] of this.stats.entries()) {
      snapshot[key] = { ...stat, averageDurationMs: stat.totalDurationMs / stat.count };
    }

    return snapshot;
  }
}
