import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Request } from 'express';
import { DiagnosticsService } from './diagnostics.service';

/**
 * Not registered globally by this milestone (would require editing
 * app.module.ts). Apply with `@UseInterceptors(DiagnosticsCaptureInterceptor)`
 * on a controller, or add it to the global APP_INTERCEPTOR list at
 * B2.21 alongside LoggingInterceptor for app-wide exception capture
 * feeding /observability/diagnostics.
 */
@Injectable()
export class DiagnosticsCaptureInterceptor implements NestInterceptor {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      catchError((error: unknown) => {
        const err = error instanceof Error ? error : new Error('Unknown error');
        const correlationId = request.headers['x-correlation-id'] as string | undefined;
        this.diagnosticsService.captureException(err, { method: request.method, url: request.originalUrl }, correlationId);
        return throwError(() => error);
      }),
    );
  }
}
