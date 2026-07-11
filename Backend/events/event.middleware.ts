import { Injectable } from '@nestjs/common';
import { EventMiddlewareFn, IEvent } from '../interfaces/event.interface';
import { AppLoggerService } from '../../common/logger/app-logger.service';

@Injectable()
export class EventMiddlewareChain {
  private readonly middlewares: EventMiddlewareFn[] = [];

  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('EventMiddlewareChain');
    this.use(this.loggingMiddleware);
  }

  use(middleware: EventMiddlewareFn): void {
    this.middlewares.push(middleware);
  }

  async run(event: IEvent, terminal: () => Promise<void>): Promise<void> {
    const dispatch = this.middlewares.reduceRight<() => Promise<void>>(
      (next, middleware) => () => middleware(event, next),
      terminal,
    );

    await dispatch();
  }

  private loggingMiddleware: EventMiddlewareFn = async (event, next) => {
    this.logger.debug(`Dispatching event "${event.eventName}" (${event.eventId})`);
    await next();
  };
}
