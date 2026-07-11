import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiMetricsService } from './api-metrics.service';

@Injectable()
export class ApiMetricsInterceptor implements NestInterceptor {
  constructor(private readonly apiMetricsService: ApiMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<{ method: string; route?: { path: string }; url: string }>();
    const endpointKey = `${request.method} ${request.route?.path ?? request.url}`;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.apiMetricsService.record(endpointKey, Date.now() - startTime, false);
      }),
      catchError((error: unknown) => {
        this.apiMetricsService.record(endpointKey, Date.now() - startTime, true);
        return throwError(() => error);
      }),
    );
  }
}
