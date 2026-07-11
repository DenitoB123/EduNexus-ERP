import { Injectable, OnModuleInit } from '@nestjs/common';
import { ObservabilityContextHolder } from '../decorators/observability-context.holder';
import { TracerService } from '../tracing/tracer.service';
import { PerformanceMonitoringService } from '../../infrastructure/monitoring/performance-monitoring.service';
import { AppLoggerService } from '../logger/app-logger.service';

@Injectable()
export class ObservabilityBootstrap implements OnModuleInit {
  constructor(
    private readonly tracerService: TracerService,
    private readonly performanceMonitoringService: PerformanceMonitoringService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(ObservabilityBootstrap.name);
  }

  onModuleInit(): void {
    ObservabilityContextHolder.init(this.tracerService, this.performanceMonitoringService, this.logger);
    this.logger.log('Observability decorator context initialized (@MeasureExecution, @TraceRequest ready)');
  }
}
