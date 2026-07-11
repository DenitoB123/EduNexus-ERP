import { Global, Module } from '@nestjs/common';
import { QueryPerformanceLogger } from './monitoring/query-performance.logger';
import { DatabaseMetricsService } from './monitoring/database-metrics.service';
import { DatabaseConnectionManager } from './services/database-connection.manager';

@Global()
@Module({
  providers: [QueryPerformanceLogger, DatabaseMetricsService, DatabaseConnectionManager],
  exports: [QueryPerformanceLogger, DatabaseMetricsService, DatabaseConnectionManager],
})
export class DatabaseMonitoringModule {}
