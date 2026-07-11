import { CustomMetricsCollector } from '../metrics/collectors/custom-metrics.collector';

/**
 * Records a call count + duration for the decorated method under a
 * named custom metric, independent of any specific endpoint or
 * class name — use this for business-meaningful counters
 * (e.g. `@TrackMetric('notification.broadcast')`) that
 * @MeasureExecution's auto-generated ClassName.methodName label
 * doesn't fit.
 */
export function TrackMetric(metricName: string): MethodDecorator {
  return (_target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      const start = Date.now();
      const result = original.apply(this, args);

      if (result instanceof Promise) {
        return result.finally(() => CustomMetricsCollector.record(metricName, Date.now() - start));
      }

      CustomMetricsCollector.record(metricName, Date.now() - start);
      return result;
    };

    return descriptor;
  };
}
