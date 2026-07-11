export type SpanKind = 'http' | 'service' | 'event' | 'queue' | 'workflow';

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  kind: SpanKind;
  name: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: 'ok' | 'error';
  error?: string;
  attributes: Record<string, unknown>;
}

export interface ITracer {
  /** Correlation/trace id for the current async context, if any (see RequestContextService). */
  getCurrentTraceId(): string | undefined;
  startSpan(kind: SpanKind, name: string, attributes?: Record<string, unknown>): Span;
  endSpan(span: Span, status?: 'ok' | 'error', error?: string): void;
  withSpan<T>(kind: SpanKind, name: string, fn: (span: Span) => Promise<T>, attributes?: Record<string, unknown>): Promise<T>;
}
