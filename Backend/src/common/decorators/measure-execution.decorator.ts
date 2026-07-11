import { ObservabilityContextHolder } from './observability-context.holder';

/**
 * Records execution time of the decorated method into the existing
 * infrastructure/monitoring/performance-monitoring.service.ts under
 * key `ClassName.methodName`, alongside the HTTP-endpoint entries
 * PerformanceMonitoringInterceptor already writes there — same
 * collector, no second metrics store.
 */
export function MeasureExecution(label?: string): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    const key = label ?? `${target.constructor.name}.${String(propertyKey)}`;

    descriptor.value = function (...args: unknown[]) {
      const performance = ObservabilityContextHolder.getPerformance();
      const start = Date.now();
      const result = original.apply(this, args);

      if (result instanceof Promise) {
        return result.finally(() => performance?.record(key, Date.now() - start));
      }

      performance?.record(key, Date.now() - start);
      return result;
    };

    return descriptor;
  };
}
