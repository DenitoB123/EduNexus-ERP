import { Injectable } from '@nestjs/common';
import { TransactionService, PrismaTransactionClient, TransactionOptions } from './transaction.service';
import { DatabaseHealthService, DatabaseHealthSnapshot } from './database-health.service';
import { DatabaseMetricsService } from '../monitoring/database-metrics.service';

@Injectable()
export class DatabaseService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly healthService: DatabaseHealthService,
    private readonly metricsService: DatabaseMetricsService,
  ) {}

  transaction<T>(
    work: (tx: PrismaTransactionClient) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    return this.transactionService.run(work, options);
  }

  getHealthSnapshot(): DatabaseHealthSnapshot {
    return this.healthService.getSnapshot();
  }

  getMetrics() {
    return this.metricsService.getSnapshot();
  }
}
