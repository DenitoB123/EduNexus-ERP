import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { AppLoggerService } from '../logger/app-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const correlationId =
      (request.headers['x-correlation-id'] as string | undefined) ?? randomUUID();
    request.headers['x-correlation-id'] = correlationId;
    response.setHeader('x-correlation-id', correlationId);

    const { method, url } = request;
    const startTime = Date.now();

    this.logger.http(`Incoming ${method} ${url}`, { correlationId });

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.http(
            `Completed ${method} ${url} ${response.statusCode} +${duration}ms`,
            { correlationId, statusCode: response.statusCode, durationMs: duration },
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.http(
            `Failed ${method} ${url} +${duration}ms - ${error.message}`,
            { correlationId, durationMs: duration },
          );
        },
      }),
    );
  }
}
