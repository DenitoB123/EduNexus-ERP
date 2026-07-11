import { Injectable } from '@nestjs/common';

export interface DatabaseMetricsSnapshot {
  totalQueries: number;
  slowQueries: number;
  failedQueries: number;
  lastQueryAt: Date | null;
  averageDurationMs: number;
}

@Injectable()
export class DatabaseMetricsService {
  private totalQueries = 0;
  private slowQueries = 0;
  private failedQueries = 0;
  private totalDurationMs = 0;
  private lastQueryAt: Date | null = null;

  recordQuery(durationMs: number, isSlow: boolean): void {
    this.totalQueries += 1;
    this.totalDurationMs += durationMs;
    this.lastQueryAt = new Date();
    if (isSlow) this.slowQueries += 1;
  }

  recordFailure(): void {
    this.failedQueries += 1;
  }

  getSnapshot(): DatabaseMetricsSnapshot {
    return {
      totalQueries: this.totalQueries,
      slowQueries: this.slowQueries,
      failedQueries: this.failedQueries,
      lastQueryAt: this.lastQueryAt,
      averageDurationMs: this.totalQueries > 0 ? this.totalDurationMs / this.totalQueries : 0,
    };
  }

  reset(): void {
    this.totalQueries = 0;
    this.slowQueries = 0;
    this.failedQueries = 0;
    this.totalDurationMs = 0;
    this.lastQueryAt = null;
  }
}
