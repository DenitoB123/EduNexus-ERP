/**
 * logging.interceptor.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * Logs every request/response pair through the same IAppLogger extension
 * point the B2.3 Generic Service Layer uses (APP_LOGGER token), so HTTP-
 * layer logs and service-layer logs share one sink/format. Falls back to
 * Nest's built-in Logger if APP_LOGGER hasn't been wired yet.
 */

import { CallHandler, ExecutionContext, Inject, Injectable, Logger, NestInterceptor, Optional } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { APP_LOGGER } from '../interfaces/tokens';
import { IAppLogger } from '../interfaces/infrastructure.interfaces';
import { IAuthenticatedRequest } from '../interfaces/controller.interfaces';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly fallbackLogger = new Logger('HTTP');

  constructor(@Optional() @Inject(APP_LOGGER) private readonly logger?: IAppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<IAuthenticatedRequest>();
    const handlerName = `${context.getClass().name}.${context.getHandler().name}`;
    const start = Date.now();

    this.log(`--> ${request.method} ${request.url}`, handlerName, {
      actorId: request.user?.userId,
      tenantId: request.tenant?.tenantId,
    });

    return next.handle().pipe(
      tap(() => {
        this.log(`<-- ${request.method} ${request.url} (${Date.now() - start}ms)`, handlerName);
      }),
      catchError((error) => {
        this.logError(`x-- ${request.method} ${request.url} (${Date.now() - start}ms)`, error, handlerName);
        throw error;
      }),
    );
  }

  private log(message: string, context: string, meta?: Record<string, unknown>) {
    if (this.logger) {
      this.logger.log(message, context, meta);
    } else {
      this.fallbackLogger.log(message);
    }
  }

  private logError(message: string, error: unknown, context: string) {
    const trace = error instanceof Error ? error.stack : undefined;
    if (this.logger) {
      this.logger.error(message, trace, context, { error: error instanceof Error ? error.message : String(error) });
    } else {
      this.fallbackLogger.error(message, trace);
    }
  }
}
