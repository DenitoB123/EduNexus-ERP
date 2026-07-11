import { EventMiddlewareFn } from '../../interfaces/event.interface';
import { AppLoggerService } from '../../../common/logger/app-logger.service';

const SLOW_EVENT_THRESHOLD_MS = 500;

/**
 * B2.7 — Event Middleware: Performance Monitoring.
 *
 * Times the full handler fan-out (all handlers for this dispatch, since
 * `next()` wraps that entire step) and logs a warning for events whose
 * total handling time exceeds the threshold, mirroring the existing
 * slow-query logging pattern used by QueryPerformanceLogger (B1.2).
 */
export function createPerformanceMonitoringMiddleware(logger: AppLoggerService): EventMiddlewareFn {
  return async (event, next) => {
    const startedAt = Date.now();
    try {
      await next();
    } finally {
      const durationMs = Date.now() - startedAt;
      if (durationMs > SLOW_EVENT_THRESHOLD_MS) {
        logger.warn(
          `Slow event dispatch: "${event.eventName}" (${event.eventId}) took ${durationMs}ms`,
        );
      }
    }
  };
}
