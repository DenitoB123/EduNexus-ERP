import { SpanKind } from '../tracing/interfaces/tracer.interface';
import { ObservabilityContextHolder } from './observability-context.holder';

/**
 * Wraps the decorated (async) method in a TracerService span of the
 * given kind — 'service' | 'event' | 'queue' | 'workflow' — so it
 * shows up in the recent-spans ring buffer under the same traceId as
 * the enclosing HTTP request (see tracing/tracer.service.ts). Only
 * meaningfully supports async methods since a span needs to close
 * after the awaited work finishes.
 */
export function TraceRequest(kind: SpanKind = 'service', name?: string): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    const spanName = name ?? `${target.constructor.name}.${String(propertyKey)}`;

    descriptor.value = async function (...args: unknown[]) {
      const tracer = ObservabilityContextHolder.getTracer();
      if (!tracer) return original.apply(this, args);

      return tracer.withSpan(kind, spanName, async () => original.apply(this, args));
    };

    return descriptor;
  };
}
