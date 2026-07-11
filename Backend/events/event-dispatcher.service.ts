import { Injectable } from '@nestjs/common';
import { IEvent } from '../interfaces/event.interface';
import { EventRegistry } from './event-registry.service';
import { EventMiddlewareChain } from './event.middleware';
import { AppLoggerService } from '../../common/logger/app-logger.service';

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
    const handlers = this.eventRegistry.getHandlers(event.eventName);

    if (handlers.length === 0) {
      this.logger.debug(`No handlers registered for event "${event.eventName}"`);
      return;
    }

    await this.middlewareChain.run(event, async () => {
      await Promise.all(
        handlers.map((handler) =>
          handler.handle(event).catch((error: unknown) => {
            const message = error instanceof Error ? error.message : 'unknown error';
            this.logger.error(
              `Handler failed for event "${event.eventName}" (${event.eventId}): ${message}`,
            );
          }),
        ),
      );
    });
  }
}
