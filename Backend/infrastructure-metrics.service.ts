import { Injectable } from '@nestjs/common';
import { DatabaseMetricsService } from '../../database/monitoring/database-metrics.service';
import { QueueMonitoringService } from '../jobs/queue-monitoring.service';

export interface InfrastructureMetricsSnapshot {
  database: ReturnType<DatabaseMetricsService['getSnapshot']>;
  jobs: ReturnType<QueueMonitoringService['getSnapshot']>;
}

@Injectable()
export class InfrastructureMetricsService {
  constructor(
    private readonly databaseMetricsService: DatabaseMetricsService,
    private readonly queueMonitoringService: QueueMonitoringService,
  ) {}

  getSnapshot(): InfrastructureMetricsSnapshot {
    return {
      database: this.databaseMetricsService.getSnapshot(),
      jobs: this.queueMonitoringService.getSnapshot(),
    };
  }
}
