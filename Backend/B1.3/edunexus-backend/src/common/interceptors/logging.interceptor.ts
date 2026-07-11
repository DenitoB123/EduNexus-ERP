import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AppLoggerService } from '../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, url, ip } = request;
    const correlationId =
      (request.headers['x-correlation-id'] as string) ?? undefined;
    const userAgent = request.get('user-agent') ?? '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = ctx.getResponse<{ statusCode: number }>();
          const duration = Date.now() - startTime;
          this.logger.logHttp(
            method,
            url,
            response.statusCode,
            duration,
            { correlationId, ip, userAgent },
          );
        },
        error: () => {
          const duration = Date.now() - startTime;
          this.logger.warn(
            `${method} ${url} failed — ${duration}ms`,
            { correlationId, ip, userAgent },
          );
        },
      }),
    );
  }
}
