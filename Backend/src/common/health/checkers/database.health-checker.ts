import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DatabaseConnectionManager } from '../../../database/services/database-connection.manager';
import { HealthCheckCategory, HealthCheckResult, IHealthChecker } from '../interfaces/health-checker.interface';
import { timedCheck } from './timed-check.util';

@Injectable()
export class DatabaseHealthChecker implements IHealthChecker {
  readonly name = 'database';
  readonly categories: HealthCheckCategory[] = ['readiness', 'startup', 'dependency'];

  constructor(
    private readonly prismaService: PrismaService,
    private readonly connectionManager: DatabaseConnectionManager,
  ) {}

  async check(): Promise<HealthCheckResult> {
    return timedCheck(this.name, async () => {
      const healthy = await this.prismaService.isHealthy();
      return {
        state: healthy ? 'up' : 'down',
        message: healthy ? undefined : 'PostgreSQL connection is not responding',
        details: { connectionState: this.connectionManager.getState() },
      };
    });
  }
}
