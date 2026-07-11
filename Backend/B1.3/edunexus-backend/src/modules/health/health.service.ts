import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../config/config.service';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'down';
  checks: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
  uptimeSeconds: number;
  timestamp: string;
}

/**
 * HealthService
 * ─────────────────────────────────────────────────────────────────────────────
 * Backs the /health endpoint anticipated by TenancyModule's route exclusion
 * and the HealthPing model from milestone 1.1. Checks the two hard
 * dependencies introduced in 1.3 (Postgres via PrismaService, Redis via a
 * throwaway ioredis client) so a load balancer / orchestrator can route
 * around an instance that can't reach either.
 */
@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const [databaseUp, redisUp] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const status: HealthCheckResult['status'] =
      databaseUp && redisUp ? 'ok' : databaseUp || redisUp ? 'degraded' : 'down';

    return {
      status,
      checks: {
        database: databaseUp ? 'up' : 'down',
        redis: redisUp ? 'up' : 'down',
      },
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /** Writes a HealthPing row — useful for an external "last successful check" audit trail. */
  async ping(): Promise<{ checkedAt: Date }> {
    const record = await this.prisma.healthPing.create({ data: {} });
    return { checkedAt: record.checkedAt };
  }

  private async checkDatabase(): Promise<boolean> {
    return this.prisma.isHealthy();
  }

  private async checkRedis(): Promise<boolean> {
    const client = new Redis({
      host: this.config.redisHost,
      port: this.config.redisPort,
      password: this.config.redisPassword,
      db: this.config.redisDb,
      lazyConnect: true,
      retryStrategy: () => null, // don't retry — this is a one-shot probe
      connectTimeout: 2000,
    });

    try {
      await client.connect();
      const pong = await client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    } finally {
      client.disconnect();
    }
  }
}
