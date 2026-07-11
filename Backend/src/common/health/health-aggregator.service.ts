import { Inject, Injectable } from '@nestjs/common';
import { AppLoggerService } from '../logger/app-logger.service';
import {
  AggregateHealthReport,
  HEALTH_CHECKERS,
  HealthCheckCategory,
  HealthCheckResult,
  HealthState,
  IHealthChecker,
} from './interfaces/health-checker.interface';

/**
 * Composes every registered IHealthChecker (injected as a
 * multi-provider array under HEALTH_CHECKERS — see
 * observability.module.ts) into the four probe categories NestJS
 * conventionally exposes to orchestrators: liveness, readiness,
 * startup, and an ad-hoc "dependency" report used for the
 * dashboard/diagnostics endpoints.
 *
 * This composes on top of, and does not replace, the existing
 * @nestjs/terminus-based `src/health/health.controller.ts` — that
 * controller's `/health/live` and `/health/ready` remain the
 * orchestrator-facing probes (e.g. Kubernetes). This service backs
 * the *new* `/observability/health/*` surface (see
 * monitoring.controller.ts) and the MonitoringService snapshot used
 * by dashboards, giving one place to add a health signal that both
 * the dashboard and (at B2.21, if desired) the terminus controller
 * can consume without re-implementing check logic twice.
 */
@Injectable()
export class HealthAggregatorService {
  constructor(
    @Inject(HEALTH_CHECKERS) private readonly checkers: IHealthChecker[],
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(HealthAggregatorService.name);
  }

  async checkCategory(category: HealthCheckCategory): Promise<AggregateHealthReport> {
    const relevant = this.checkers.filter((c) => c.categories.includes(category));
    const checks = await this.runAll(relevant);

    return {
      status: this.worstOf(checks),
      category,
      checks,
      generatedAt: new Date().toISOString(),
    };
  }

  async checkAll(): Promise<HealthCheckResult[]> {
    return this.runAll(this.checkers);
  }

  async checkOne(name: string): Promise<HealthCheckResult | null> {
    const checker = this.checkers.find((c) => c.name === name);
    if (!checker) return null;
    return checker.check();
  }

  listRegisteredCheckers(): string[] {
    return this.checkers.map((c) => c.name);
  }

  private async runAll(checkers: IHealthChecker[]): Promise<HealthCheckResult[]> {
    const results = await Promise.all(
      checkers.map(async (checker) => {
        const result = await checker.check();
        if (result.state === 'down') {
          this.logger.warn(`Health checker "${checker.name}" reported DOWN: ${result.message ?? 'no message'}`);
        }
        return result;
      }),
    );
    return results;
  }

  private worstOf(checks: HealthCheckResult[]): HealthState {
    if (checks.some((c) => c.state === 'down')) return 'down';
    if (checks.some((c) => c.state === 'degraded')) return 'degraded';
    return 'up';
  }
}
