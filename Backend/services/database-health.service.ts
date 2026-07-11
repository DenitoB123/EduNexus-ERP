import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DatabaseConnectionManager } from './database-connection.manager';
import { DatabaseMetricsService } from '../monitoring/database-metrics.service';

export interface DatabaseHealthSnapshot {
  connected: boolean;
  state: string;
  metrics: ReturnType<DatabaseMetricsService['getSnapshot']>;
}

@Injectable()
export class DatabaseHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectionManager: DatabaseConnectionManager,
    private readonly metrics: DatabaseMetricsService,
  ) {}

  async checkLiveness(): Promise<boolean> {
    return this.connectionManager.isConnected();
  }

  async checkReadiness(): Promise<boolean> {
    return this.prisma.isHealthy();
  }

  getSnapshot(): DatabaseHealthSnapshot {
    return {
      connected: this.connectionManager.isConnected(),
      state: this.connectionManager.getState(),
      metrics: this.metrics.getSnapshot(),
    };
  }
}
