import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { TenantIsolationCheck } from './checks/tenant-isolation.check';
import { ReferentialIntegrityCheck } from './checks/referential-integrity.check';
import { QaCheck, QaCheckResult } from './qa.types';

/**
 * QaService
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs the registered QaCheck implementations (tenant isolation,
 * referential integrity, ...), persists each result to QaCheckRun for
 * history/trend tracking, and emits an event on failure so the system can
 * alert someone instead of a check quietly failing into a database row
 * nobody looks at.
 *
 * Run automatically (see SchedulerModule's hook point — wire a QA cron task
 * there once this module is reviewed) and on-demand via the controller for
 * pre-release verification, matching the brief's "data integrity
 * validation... consistency checking... health verification" requirement.
 *
 * Add new checks by implementing QaCheck and registering it in `checks`
 * below and in QualityAssuranceModule's providers — do not scatter ad-hoc
 * verification scripts elsewhere.
 */
@Injectable()
export class QaService {
  private readonly checks: QaCheck[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly eventBus: EventBusService,
    tenantIsolationCheck: TenantIsolationCheck,
    referentialIntegrityCheck: ReferentialIntegrityCheck,
  ) {
    this.checks = [tenantIsolationCheck, referentialIntegrityCheck];
  }

  async runAll(): Promise<QaCheckResult[]> {
    const results: QaCheckResult[] = [];
    for (const check of this.checks) {
      const result = await this.runOne(check);
      results.push(result);
    }
    return results;
  }

  async runByName(checkName: string): Promise<QaCheckResult> {
    const check = this.checks.find((c) => c.name === checkName);
    if (!check) {
      throw new Error(`Unknown QA check '${checkName}'`);
    }
    return this.runOne(check);
  }

  listAvailableChecks(): string[] {
    return this.checks.map((c) => c.name);
  }

  async getHistory(checkName?: string, limit = 50) {
    return this.prisma.qaCheckRun.findMany({
      where: checkName ? { checkName } : undefined,
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  private async runOne(check: QaCheck): Promise<QaCheckResult> {
    const startedAt = new Date();
    try {
      const result = await check.run();
      await this.prisma.qaCheckRun.create({
        data: {
          checkName: result.checkName,
          status: result.status,
          issuesFound: result.issuesFound,
          details: result.details,
          startedAt,
          finishedAt: new Date(),
        },
      });

      if (result.status === 'FAILED') {
        await this.eventBus.publish({
          name: 'qa.check.failed',
          payload: { checkName: result.checkName, issuesFound: result.issuesFound },
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`QA check '${check.name}' threw`, (error as Error)?.stack);
      const failedResult: QaCheckResult = {
        checkName: check.name,
        status: 'FAILED',
        issuesFound: -1,
        details: { error: (error as Error)?.message },
      };
      await this.prisma.qaCheckRun.create({
        data: { ...failedResult, startedAt, finishedAt: new Date() },
      });
      return failedResult;
    }
  }
}
