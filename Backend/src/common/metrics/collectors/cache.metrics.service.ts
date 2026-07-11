import { Injectable } from '@nestjs/common';
import { IMetricCollector } from '../interfaces/metric-collector.interface';

export interface CacheMetricsSnapshot {
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
  hitRate: number;
}

/**
 * infrastructure/cache/cache.service.ts (B2.2) has no built-in
 * hit/miss instrumentation. Rather than modify that foundation file
 * to call into this collector (out of scope for a parallel
 * milestone), this is exposed as a small recording API that CacheService
 * callers — or CacheService itself at B2.21 — can call directly:
 * `cacheMetricsService.recordHit()` after a `cacheService.get()`
 * returns non-null, `recordMiss()` when it returns null, etc.
 */
@Injectable()
export class CacheMetricsService implements IMetricCollector<CacheMetricsSnapshot> {
  readonly name = 'cache';
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private invalidations = 0;

  recordHit(): void {
    this.hits += 1;
  }

  recordMiss(): void {
    this.misses += 1;
  }

  recordSet(): void {
    this.sets += 1;
  }

  recordInvalidation(count = 1): void {
    this.invalidations += count;
  }

  getSnapshot(): CacheMetricsSnapshot {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      invalidations: this.invalidations,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}
