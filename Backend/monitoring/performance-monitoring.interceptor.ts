import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PerformanceMonitoringService } from './performance-monitoring.service';

@Injectable()
export class PerformanceMonitoringInterceptor implements NestInterceptor {
  constructor(private readonly performanceMonitoringService: PerformanceMonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{ method: string; route?: { path: string }; url: string }>();
    const endpointKey = `${request.method} ${request.route?.path ?? request.url}`;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.performanceMonitoringService.record(endpointKey, Date.now() - startTime);
      }),
    );
  }
}
