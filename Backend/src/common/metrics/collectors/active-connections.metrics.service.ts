import { Injectable } from '@nestjs/common';
import { IMetricCollector } from '../interfaces/metric-collector.interface';

export interface ActiveConnectionsSnapshot {
  activeHttpRequests: number;
  peakHttpRequests: number;
}

/**
 * In-flight HTTP request gauge. Incremented/decremented by
 * ActiveConnectionsInterceptor (metrics/active-connections.interceptor.ts).
 * Registering that interceptor is left to B2.21 (see
 * IMPLEMENTATION_SUMMARY_B2_16.md §5) rather than edited into
 * app.module.ts here, per the parallel-milestone rule against
 * modifying foundation files.
 */
@Injectable()
export class ActiveConnectionsMetricsService implements IMetricCollector<ActiveConnectionsSnapshot> {
  readonly name = 'connections';
  private active = 0;
  private peak = 0;

  increment(): void {
    this.active += 1;
    this.peak = Math.max(this.peak, this.active);
  }

  decrement(): void {
    this.active = Math.max(0, this.active - 1);
  }

  getSnapshot(): ActiveConnectionsSnapshot {
    return { activeHttpRequests: this.active, peakHttpRequests: this.peak };
  }
}
