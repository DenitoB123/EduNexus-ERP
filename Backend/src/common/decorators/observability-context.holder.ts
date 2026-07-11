import { AppLoggerService } from '../logger/app-logger.service';
import { TracerService } from '../tracing/tracer.service';
import { PerformanceMonitoringService } from '../../infrastructure/monitoring/performance-monitoring.service';

/**
 * Decorators (measure-execution, trace-request, track-metric) run at
 * class-definition time, before Nest's DI container exists, so they
 * cannot `constructor`-inject services the normal way. This holder
 * is populated once, in ObservabilityModule's onModuleInit
 * (observability.module.ts), with the same singleton instances the
 * rest of the app already gets via DI — it does not create parallel
 * copies of PerformanceMonitoringService/TracerService, only exposes
 * the DI-managed ones to code that runs outside DI's reach. If a
 * decorated method executes before bootstrap finishes (should not
 * happen for real requests), the decorators degrade to a no-op with
 * a one-time console warning rather than throwing.
 */
export class ObservabilityContextHolder {
  private static tracer?: TracerService;
  private static performance?: PerformanceMonitoringService;
  private static logger?: AppLoggerService;
  private static warned = false;

  static init(tracer: TracerService, performance: PerformanceMonitoringService, logger: AppLoggerService): void {
    ObservabilityContextHolder.tracer = tracer;
    ObservabilityContextHolder.performance = performance;
    ObservabilityContextHolder.logger = logger;
  }

  static getTracer(): TracerService | undefined {
    ObservabilityContextHolder.warnIfUninitialized();
    return ObservabilityContextHolder.tracer;
  }

  static getPerformance(): PerformanceMonitoringService | undefined {
    ObservabilityContextHolder.warnIfUninitialized();
    return ObservabilityContextHolder.performance;
  }

  static getLogger(): AppLoggerService | undefined {
    return ObservabilityContextHolder.logger;
  }

  private static warnIfUninitialized(): void {
    if (!ObservabilityContextHolder.tracer && !ObservabilityContextHolder.warned) {
      ObservabilityContextHolder.warned = true;
      // eslint-disable-next-line no-console
      console.warn(
        '[ObservabilityContextHolder] Decorator invoked before ObservabilityModule finished bootstrapping; metrics/tracing for this call were skipped.',
      );
    }
  }
}
