import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  INestApplication,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { AppConfigService } from '../config/app-config.service';
import { AppLoggerService } from '../common/logger/app-logger.service';
import { DatabaseConnectionManager } from '../database/services/database-connection.manager';
import { QueryPerformanceLogger } from '../database/monitoring/query-performance.logger';
import { DatabaseMetricsService } from '../database/monitoring/database-metrics.service';
import { attachQueryLoggingMiddleware } from '../database/middleware/prisma-query-logging.middleware';
import { buildConnectionUrl } from '../database/providers/connection-url.builder';
import { createOptimisticLockingExtension } from '../database/providers/prisma-extensions.provider';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly configService: AppConfigService,
    private readonly logger: AppLoggerService,
    private readonly connectionManager: DatabaseConnectionManager,
    private readonly performanceLogger: QueryPerformanceLogger,
    private readonly metricsService: DatabaseMetricsService,
  ) {
    const databaseConfig = configService.database;

    const logConfig: Prisma.LogDefinition[] = databaseConfig.logging
      ? [
          { level: 'query', emit: 'event' },
          { level: 'info', emit: 'event' },
          { level: 'warn', emit: 'event' },
          { level: 'error', emit: 'event' },
        ]
      : [
          { level: 'warn', emit: 'event' },
          { level: 'error', emit: 'event' },
        ];

    super({
      datasources: {
        db: { url: buildConnectionUrl(databaseConfig) },
      },
      log: logConfig,
    });

    this.logger.setContext('PrismaService');
  }

  async onModuleInit(): Promise<void> {
    this.attachLogging();
    await this.connectionManager.connectWithRetry(() => this.$connect());
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.connectionManager.markDisconnected();
    this.logger.log('Prisma disconnected from PostgreSQL database');
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns a Prisma client extended with optimistic-locking
   * enforcement, for repositories (Phase 1.4) that need it on
   * `update()` calls supplying an expected `version`.
   */
  withOptimisticLocking() {
    return this.$extends(createOptimisticLockingExtension());
  }

  private attachLogging(): void {
    const onQuery = (cb: (event: Prisma.QueryEvent) => void) =>
      (this as unknown as { $on: (event: 'query', cb: (e: Prisma.QueryEvent) => void) => void }).$on(
        'query',
        cb,
      );

    if (this.configService.database.logging) {
      attachQueryLoggingMiddleware(
        onQuery,
        this.performanceLogger,
        this.metricsService,
        this.configService.database.slowQueryThresholdMs,
      );
    }

    (this as unknown as { $on: (event: string, cb: (e: Prisma.LogEvent) => void) => void }).$on(
      'warn',
      (event: Prisma.LogEvent) => {
        this.logger.warn(event.message);
      },
    );

    (this as unknown as { $on: (event: string, cb: (e: Prisma.LogEvent) => void) => void }).$on(
      'error',
      (event: Prisma.LogEvent) => {
        this.metricsService.recordFailure();
        this.logger.error(event.message);
      },
    );
  }
}
