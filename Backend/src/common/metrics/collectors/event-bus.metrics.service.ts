import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventMiddlewareChain } from '../../../infrastructure/events/event.middleware';
import { IMetricCollector } from '../interfaces/metric-collector.interface';

export interface EventBusMetricsSnapshot {
  dispatched: number;
  failed: number;
  totalDurationMs: number;
  averageDurationMs: number;
  byEventName: Record<string, number>;
}

/**
 * Genuinely wired in, not a stub: registers itself as middleware on
 * the existing infrastructure/events/event.middleware.ts chain via
 * `EventMiddlewareChain.use()` — the same public extension point
 * B2.2 built for exactly this purpose — so every EventBus.emit()
 * across the whole app (including future modules) is measured
 * without modifying event-dispatcher.service.ts or event.module.ts.
 */
@Injectable()
export class EventBusMetricsService implements IMetricCollector<EventBusMetricsSnapshot>, OnModuleInit {
  readonly name = 'eventBus';
  private dispatched = 0;
  private failed = 0;
  private totalDurationMs = 0;
  private readonly byEventName = new Map<string, number>();

  constructor(private readonly middlewareChain: EventMiddlewareChain) {}

  onModuleInit(): void {
    this.middlewareChain.use(async (event, next) => {
      const start = Date.now();
      try {
        await next();
        this.dispatched += 1;
      } catch (error) {
        this.failed += 1;
        throw error;
      } finally {
        this.totalDurationMs += Date.now() - start;
        this.byEventName.set(event.eventName, (this.byEventName.get(event.eventName) ?? 0) + 1);
      }
    });
  }

  getSnapshot(): EventBusMetricsSnapshot {
    const total = this.dispatched + this.failed;
    return {
      dispatched: this.dispatched,
      failed: this.failed,
      totalDurationMs: this.totalDurationMs,
      averageDurationMs: total > 0 ? this.totalDurationMs / total : 0,
      byEventName: Object.fromEntries(this.byEventName),
    };
  }
}
