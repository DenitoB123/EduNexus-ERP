import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ActiveConnectionsMetricsService } from './active-connections.metrics.service';

@Injectable()
export class ActiveConnectionsInterceptor implements NestInterceptor {
  constructor(private readonly activeConnectionsMetrics: ActiveConnectionsMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    this.activeConnectionsMetrics.increment();
    return next.handle().pipe(finalize(() => this.activeConnectionsMetrics.decrement()));
  }
}
