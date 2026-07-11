/**
 * performance-monitoring.interceptor.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * Emits a `http.request.duration_ms` metric per request via the same
 * IAppLogger.metric() hook the B2.3 BusinessRulesEngine uses for rule
 * timing, plus a warning log for requests exceeding a configurable
 * slow-request threshold.
 */

import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor, Optional } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { APP_LOGGER } from '../interfaces/tokens';
import { IAppLogger } from '../interfaces/infrastructure.interfaces';
import { IAuthenticatedRequest } from '../interfaces/controller.interfaces';

export const SLOW_REQUEST_THRESHOLD_MS = 1000;

@Injectable()
export class PerformanceMonitoringInterceptor implements NestInterceptor {
  constructor(@Optional() @Inject(APP_LOGGER) private readonly logger?: IAppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<IAuthenticatedRequest>();
    const handlerName = `${context.getClass().name}.${context.getHandler().name}`;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - start;
        this.logger?.metric('http.request.duration_ms', durationMs, {
          handler: handlerName,
          method: request.method,
          url: request.url,
        });
        if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
          this.logger?.warn(`Slow request: ${request.method} ${request.url} took ${durationMs}ms`, handlerName);
        }
      }),
    );
  }
}
