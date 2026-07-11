import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { CACHE_REDIS_CLIENT } from '../cache/cache.module';
import { EventBusService } from '../event-bus/event-bus.service';
import { SCHEDULER_LOCK_PREFIX } from './scheduler.constants';

// NOTE: borrows CacheModule's Redis connection for the distributed lock
// below rather than src/infrastructure/redis/redis.service.ts — see the
// comment in cache.service.ts / GAP_ANALYSIS.md for why that module isn't
// safe to depend on yet.

/**
 * SchedulerService
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps every registered cron task with:
 *   1. A distributed Redis lock (SET NX EX) so the same task never runs
 *      concurrently across multiple app replicas — @nestjs/schedule has no
 *      built-in concept of "only one node should run this."
 *   2. A ScheduledTaskRun row for observability/history (start, finish,
 *      success/failure, error).
 *   3. An EventBus emission on completion/failure so other modules
 *      (notifications, audit) can react without polling.
 *
 * Task classes (in ./tasks) call `runWithGuard()` instead of putting logic
 * directly in their @Cron handler.
 */
@Injectable()
export class SchedulerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    @Inject(CACHE_REDIS_CLIENT) private readonly redis: Redis,
    private readonly eventBus: EventBusService,
  ) {}

  async runWithGuard(
    taskName: string,
    fn: () => Promise<Record<string, unknown> | void>,
    options: { lockTtlSeconds?: number } = {},
  ): Promise<void> {
    const lockKey = `${SCHEDULER_LOCK_PREFIX}:${taskName}`;
    const lockTtl = options.lockTtlSeconds ?? 600;

    const acquired = await this.acquireLock(lockKey, lockTtl);
    if (!acquired) {
      this.logger.log(`Skipping '${taskName}' — already running on another instance`);
      return;
    }

    const run = await this.prisma.scheduledTaskRun.create({
      data: { taskName, status: 'RUNNING' },
    });

    try {
      const metadata = (await fn()) ?? {};
      await this.prisma.scheduledTaskRun.update({
        where: { id: run.id },
        data: { status: 'SUCCESS', finishedAt: new Date(), metadata },
      });
      await this.eventBus.publish({
        name: 'scheduler.task.completed',
        payload: { taskName, runId: run.id, ...metadata },
      });
    } catch (error) {
      const message = (error as Error)?.message ?? 'Unknown error';
      this.logger.error(`Scheduled task '${taskName}' failed: ${message}`, (error as Error)?.stack);
      await this.prisma.scheduledTaskRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', finishedAt: new Date(), error: message },
      });
      await this.eventBus.publish({
        name: 'scheduler.task.failed',
        payload: { taskName, runId: run.id, error: message },
      });
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  private async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  private async releaseLock(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async getRecentRuns(taskName?: string, limit = 50) {
    return this.prisma.scheduledTaskRun.findMany({
      where: taskName ? { taskName } : undefined,
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}
