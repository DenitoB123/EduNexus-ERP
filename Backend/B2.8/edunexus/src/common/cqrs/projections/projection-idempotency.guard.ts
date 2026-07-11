import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import {
  CQRS_PROJECTION_IDEMPOTENCY_PREFIX,
  CQRS_PROJECTION_IDEMPOTENCY_TTL_SECONDS,
} from '../constants/cqrs.constants';

/**
 * Narrow, projection-scoped idempotency check built on the existing
 * `CacheService` (infrastructure/cache, B1.x): before a projection
 * applies an event, it marks `{eventId, projectionName}` as applied;
 * if that marker already exists (e.g. the event bus redelivered the
 * event after a handler timeout), the projection is skipped.
 *
 * This is intentionally scoped to *projections only* — it is not a
 * general Event Bus idempotency/retry mechanism. The current
 * `EventBus`/`EventDispatcher` (infrastructure/events, B1.3) has no
 * redelivery at all today (a failed handler just logs and moves on;
 * see `EventDispatcher.dispatch`), so this guard is defensive/forward
 * -looking for whatever redelivery semantics B2.7's "enhanced event
 * infrastructure" milestone introduces, rather than a workaround for
 * a redelivery bug that exists today.
 */
@Injectable()
export class ProjectionIdempotencyGuard {
  constructor(private readonly cacheService: CacheService) {}

  async hasApplied(eventId: string, projectionName: string): Promise<boolean> {
    return this.cacheService.exists(this.buildKey(eventId, projectionName));
  }

  async markApplied(eventId: string, projectionName: string): Promise<void> {
    await this.cacheService.set(
      this.buildKey(eventId, projectionName),
      true,
      CQRS_PROJECTION_IDEMPOTENCY_TTL_SECONDS,
    );
  }

  private buildKey(eventId: string, projectionName: string): string {
    return `${CQRS_PROJECTION_IDEMPOTENCY_PREFIX}:${projectionName}:${eventId}`;
  }
}
