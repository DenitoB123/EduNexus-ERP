import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { SchedulerService } from '../scheduler.service';
import { SCHEDULED_TASK_NAMES } from '../scheduler.constants';

/**
 * System housekeeping cron tasks. Each handler is a thin trigger —
 * all locking/run-tracking/error-handling lives in SchedulerService.runWithGuard.
 */
@Injectable()
export class CleanupTasks {
  constructor(
    private readonly scheduler: SchedulerService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanExpiredRefreshTokens(): Promise<void> {
    await this.scheduler.runWithGuard(
      SCHEDULED_TASK_NAMES.CLEAN_EXPIRED_REFRESH_TOKENS,
      async () => {
        const { count } = await this.prisma.refreshToken.deleteMany({
          where: { expiresAt: { lt: new Date() } },
        });
        return { deletedCount: count };
      },
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeOldAuditLogs(): Promise<void> {
    await this.scheduler.runWithGuard(
      SCHEDULED_TASK_NAMES.PURGE_OLD_AUDIT_LOGS,
      async () => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 365);
        const { count } = await this.prisma.auditLog.deleteMany({
          where: { createdAt: { lt: cutoff } },
        });
        return { deletedCount: count, cutoff: cutoff.toISOString() };
      },
      { lockTtlSeconds: 1800 },
    );
  }
}
