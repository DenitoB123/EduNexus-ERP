import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly config: AppConfigService) {
    super({
      datasources: {
        db: { url: config.databaseUrl },
      },
      log: PrismaService.buildLogConfig(config.isDevelopment),
      errorFormat: config.isProduction ? 'minimal' : 'pretty',
    });

    this.registerEventListeners();
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('✅ Database connection established');
    } catch (error) {
      this.logger.error('❌ Failed to connect to the database', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  // ── Health check ───────────────────────────────────────────────────────────

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  // ── Soft-delete utility ────────────────────────────────────────────────────
  // Convention: domain models with a `deletedAt` field use this helper.

  async softDelete<T>(
    model: { update: (args: Prisma.SelectSubset<unknown, unknown>) => Promise<T> },
    id: string,
  ): Promise<T> {
    return model.update({
      where: { id },
      data: { deletedAt: new Date() },
    } as Prisma.SelectSubset<unknown, unknown>) as Promise<T>;
  }

  // ── Transaction helper ─────────────────────────────────────────────────────

  async withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<T> {
    return this.$transaction(fn, options);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private static buildLogConfig(
    isDev: boolean,
  ): Prisma.PrismaClientOptions['log'] {
    if (isDev) {
      return [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ];
    }
    return [
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ];
  }

  private registerEventListeners(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).$on('query', (event: Prisma.QueryEvent) => {
      this.logger.debug(
        `Query: ${event.query} — Params: ${event.params} — Duration: ${event.duration}ms`,
      );
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).$on('info', (event: Prisma.LogEvent) => {
      this.logger.log(event.message);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).$on('warn', (event: Prisma.LogEvent) => {
      this.logger.warn(event.message);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).$on('error', (event: Prisma.LogEvent) => {
      this.logger.error(event.message);
    });
  }
}
