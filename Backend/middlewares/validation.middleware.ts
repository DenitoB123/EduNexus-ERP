import { EventMiddlewareFn } from '../../interfaces/event.interface';
import { EventMetadataUtil } from '../event-metadata.util';
import { AppLoggerService } from '../../../common/logger/app-logger.service';

/**
 * B2.7 — Event Middleware: Validation.
 *
 * Runs EventMetadataUtil.validate() before any handler executes. An
 * invalid event (missing eventId/eventName/occurredAt, or a name that
 * doesn't follow "domain.action" dot-notation) is logged and dropped
 * rather than handed to handlers that assume a well-formed shape.
 */
export function createValidationMiddleware(logger: AppLoggerService): EventMiddlewareFn {
  return async (event, next) => {
    const errors = EventMetadataUtil.validate(event);

    if (errors.length > 0) {
      logger.error(
        `Rejected invalid event "${event.eventName ?? '(unnamed)'}": ${errors.join('; ')}`,
      );
      return;
    }

    await next();
  };
}
