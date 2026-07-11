import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RequestContextService } from '../../infrastructure/monitoring/request-context.service';
import { AppLoggerService } from '../logger/app-logger.service';
import { ITracer, Span, SpanKind } from './interfaces/tracer.interface';

const MAX_RECENT_SPANS = 200;

/**
 * Builds distributed tracing on top of the existing
 * infrastructure/monitoring/request-context.service.ts, which
 * already threads a correlation id through every HTTP request via
 * AsyncLocalStorage (RequestContextMiddleware, registered globally
 * in app.module.ts). That correlation id becomes this tracer's
 * traceId for any span opened during that request; outside of an
 * HTTP request (a cron task, a queue consumer) a fresh traceId is
 * minted per root span so background work is still traceable.
 *
 * Span/event/queue/workflow tracing did not exist anywhere in the
 * foundation — this is new. HTTP request tracing itself is *not*
 * duplicated: RequestContextMiddleware + LoggingInterceptor already
 * cover that; TracerService adds the ability to open named
 * sub-spans (service calls, event handling, queue jobs, multi-step
 * workflows) underneath that request-level trace id.
 */
@Injectable()
export class TracerService implements ITracer {
  private readonly recentSpans: Span[] = [];

  constructor(
    private readonly requestContextService: RequestContextService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(TracerService.name);
  }

  getCurrentTraceId(): string | undefined {
    return this.requestContextService.getCorrelationId();
  }

  startSpan(kind: SpanKind, name: string, attributes: Record<string, unknown> = {}): Span {
    const traceId = this.getCurrentTraceId() ?? randomUUID();

    return {
      traceId,
      spanId: randomUUID(),
      kind,
      name,
      startedAt: Date.now(),
      status: 'ok',
      attributes,
    };
  }

  endSpan(span: Span, status: 'ok' | 'error' = 'ok', error?: string): void {
    span.endedAt = Date.now();
    span.durationMs = span.endedAt - span.startedAt;
    span.status = status;
    span.error = error;

    this.recentSpans.push(span);
    if (this.recentSpans.length > MAX_RECENT_SPANS) this.recentSpans.shift();

    const level = status === 'error' ? 'warn' : 'debug';
    this.logger[level](
      `[trace ${span.traceId}] ${span.kind}:${span.name} ${status} +${span.durationMs}ms` +
        (error ? ` — ${error}` : ''),
    );
  }

  async withSpan<T>(
    kind: SpanKind,
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Record<string, unknown>,
  ): Promise<T> {
    const span = this.startSpan(kind, name, attributes);
    try {
      const result = await fn(span);
      this.endSpan(span, 'ok');
      return result;
    } catch (error) {
      this.endSpan(span, 'error', error instanceof Error ? error.message : 'unknown error');
      throw error;
    }
  }

  /** Recent spans, most-recent-last — used by the diagnostics/dashboard endpoints. Bounded ring buffer, not persisted. */
  getRecentSpans(traceId?: string): Span[] {
    return traceId ? this.recentSpans.filter((s) => s.traceId === traceId) : [...this.recentSpans];
  }
}
