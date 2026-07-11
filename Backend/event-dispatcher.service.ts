import { Injectable } from '@nestjs/common';
import { EventPriority, IEvent, IEventHandler } from '../interfaces/event.interface';
import { EventRegistry } from './event-registry.service';
import { EventMiddlewareChain } from './event.middleware';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { MessageRetryStrategy } from '../rabbitmq/retry-strategy';

const DISPATCH_MAX_RETRIES = 3;

@Injectable()
export class EventDispatcher {
  constructor(
    private readonly eventRegistry: EventRegistry,
    private readonly middlewareChain: EventMiddlewareChain,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('EventDispatcher');
  }

  async dispatch(event: IEvent): Promise<void> {
    // B2.7 — Broadcast: global handlers (e.g. PersistAllEventsSubscriber)
    // receive every event, in addition to whatever's registered by name.
    const handlers = [
      ...this.eventRegistry.getGlobalHandlers(),
      ...this.eventRegistry.getHandlers(event.eventName),
    ];

    if (handlers.length === 0) {
      this.logger.debug(`No handlers registered for event "${event.eventName}"`);
      return;
    }

    await this.middlewareChain.run(event, async () => {
      // B2.7 — Event Priorities / Ordered Execution: CRITICAL and HIGH
      // priority events run their handlers sequentially, in priority
      // order, so a failure is attributable and downstream handlers
      // don't race ahead of a more important one. NORMAL/LOW keep the
      // original B1.3 concurrent fan-out.
      if (event.priority === EventPriority.CRITICAL || event.priority === EventPriority.HIGH) {
        for (const handler of handlers) {
          await this.runWithRetry(handler, event);
        }
      } else {
        await Promise.all(handlers.map((handler) => this.runWithRetry(handler, event)));
      }
    });
  }

  /**
   * B2.7 — Retry Infrastructure: automatic retry with exponential-ish
   * backoff (reusing the existing MessageRetryStrategy from the
   * RabbitMQ layer, so retry/backoff behavior is consistent across
   * in-process and cross-service event delivery) up to
   * DISPATCH_MAX_RETRIES, then failure is logged and swallowed so one
   * handler's exhaustion never blocks sibling handlers or the caller.
   * Cross-service IntegrationEvents additionally benefit from
   * RabbitMQ's own DLQ (DeadLetterQueueManager) once published via
   * EventPublisher — this local retry covers in-process DomainEvent/
   * ApplicationEvent/AuditEvent/NotificationEvent/SystemEvent handlers.
   */
  private async runWithRetry(handler: IEventHandler<IEvent>, event: IEvent): Promise<void> {
    const handlerName = handler.handlerName ?? handler.constructor?.name ?? 'anonymous';
    let attempt = 0;

    for (;;) {
      try {
        await handler.handle(event);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';

        if (!MessageRetryStrategy.shouldRetry(attempt, DISPATCH_MAX_RETRIES)) {
          this.logger.error(
            `Handler "${handlerName}" failed for event "${event.eventName}" (${event.eventId}) after ${attempt + 1} attempt(s): ${message}`,
          );
          return;
        }

        const delayMs = MessageRetryStrategy.nextDelayMs(attempt);
        this.logger.warn(
          `Handler "${handlerName}" failed for event "${event.eventName}" (${event.eventId}), attempt ${attempt + 1}/${DISPATCH_MAX_RETRIES}, retrying in ${delayMs}ms: ${message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempt += 1;
      }
    }
  }
}
