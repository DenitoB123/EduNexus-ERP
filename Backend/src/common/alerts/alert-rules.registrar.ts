import { Injectable, OnModuleInit } from '@nestjs/common';
import { CronService } from '../../infrastructure/scheduler/cron.service';
import { AlertService } from './alert.service';
import { HealthAggregatorService } from '../health/health-aggregator.service';
import { MetricsRegistryService } from '../metrics/metrics-registry.service';
import { DiagnosticsService } from '../diagnostics/diagnostics.service';
import { AlertRule } from './interfaces/alert.interface';

const ALERT_EVALUATION_CRON = '*/1 * * * *'; // every minute
const HIGH_LATENCY_THRESHOLD_MS = 1500;
const HIGH_ERROR_RATE_THRESHOLD = 0.1; // 10%
const HEAP_EXHAUSTION_THRESHOLD_MB = 450;
const CRITICAL_EXCEPTION_BURST_THRESHOLD = 5;
const CRITICAL_EXCEPTION_WINDOW_MS = 5 * 60 * 1000;

/**
 * Registers the 7 alert categories the B2.16 spec calls for, each
 * built entirely on services this same milestone already assembled
 * (HealthAggregatorService, MetricsRegistryService, DiagnosticsService)
 * — no new detection logic duplicated, only threshold policy.
 * Scheduling reuses the existing infrastructure/scheduler CronService
 * rather than introducing a second timer mechanism.
 */
@Injectable()
export class AlertRulesRegistrar implements OnModuleInit {
  constructor(
    private readonly alertService: AlertService,
    private readonly cronService: CronService,
    private readonly healthAggregatorService: HealthAggregatorService,
    private readonly metricsRegistryService: MetricsRegistryService,
    private readonly diagnosticsService: DiagnosticsService,
  ) {}

  onModuleInit(): void {
    this.buildRules().forEach((rule) => this.alertService.registerRule(rule));
    this.cronService.addCron('observability:alert-evaluation', ALERT_EVALUATION_CRON, () => {
      void this.alertService.evaluateAll();
    });
  }

  private buildRules(): AlertRule[] {
    return [
      this.serviceFailureRule(),
      this.databaseFailureRule(),
      this.queueFailureRule(),
      this.cacheFailureRule(),
      this.highLatencyRule(),
      this.resourceExhaustionRule(),
      this.criticalErrorsRule(),
    ];
  }

  /** Generic "any dependency is down" rule — covers services beyond the four named explicitly below. */
  private serviceFailureRule(): AlertRule {
    return {
      id: 'service-failure',
      title: 'Service dependency failure',
      severity: 'critical',
      cooldownMs: 5 * 60 * 1000,
      evaluate: async () => {
        const report = await this.healthAggregatorService.checkCategory('dependency');
        const down = report.checks.filter((c) => c.state === 'down');
        if (down.length === 0) return null;
        return {
          severity: 'critical',
          title: 'Service dependency failure',
          message: `${down.length} dependenc${down.length === 1 ? 'y is' : 'ies are'} DOWN: ${down.map((d) => d.name).join(', ')}`,
          details: { down: down.map((d) => ({ name: d.name, message: d.message })) },
        };
      },
    };
  }

  private databaseFailureRule(): AlertRule {
    return {
      id: 'database-failure',
      title: 'Database failure',
      severity: 'critical',
      cooldownMs: 5 * 60 * 1000,
      evaluate: async () => {
        const result = await this.healthAggregatorService.checkOne('database');
        if (!result || result.state !== 'down') return null;
        return { severity: 'critical', title: 'Database failure', message: result.message ?? 'Database is unreachable' };
      },
    };
  }

  private queueFailureRule(): AlertRule {
    return {
      id: 'queue-failure',
      title: 'Queue/broker failure',
      severity: 'critical',
      cooldownMs: 5 * 60 * 1000,
      evaluate: async () => {
        const result = await this.healthAggregatorService.checkOne('queue');
        if (!result || result.state !== 'down') return null;
        return { severity: 'critical', title: 'Queue/broker failure', message: result.message ?? 'Message broker is unreachable' };
      },
    };
  }

  private cacheFailureRule(): AlertRule {
    return {
      id: 'cache-failure',
      title: 'Cache failure',
      severity: 'warning',
      cooldownMs: 5 * 60 * 1000,
      evaluate: async () => {
        const result = await this.healthAggregatorService.checkOne('cache');
        if (!result || result.state !== 'down') return null;
        return { severity: 'warning', title: 'Cache failure', message: result.message ?? 'Cache layer is not functioning' };
      },
    };
  }

  private highLatencyRule(): AlertRule {
    return {
      id: 'high-latency',
      title: 'High latency detected',
      severity: 'warning',
      cooldownMs: 10 * 60 * 1000,
      evaluate: async () => {
        const responseTime = this.metricsRegistryService.getSnapshot().responseTime;
        const flagged = Object.entries(responseTime).filter(([, stat]) => stat.averageDurationMs > HIGH_LATENCY_THRESHOLD_MS);
        if (flagged.length === 0) return null;
        return {
          severity: 'warning',
          title: 'High latency detected',
          message: `${flagged.length} endpoint(s) averaging over ${HIGH_LATENCY_THRESHOLD_MS}ms`,
          details: { endpoints: flagged.map(([key, stat]) => ({ endpoint: key, averageDurationMs: stat.averageDurationMs })) },
        };
      },
    };
  }

  private resourceExhaustionRule(): AlertRule {
    return {
      id: 'resource-exhaustion',
      title: 'Resource exhaustion',
      severity: 'critical',
      cooldownMs: 5 * 60 * 1000,
      evaluate: async () => {
        const system = this.metricsRegistryService.getSnapshot().system;
        if (system.memory.heapUsedMb < HEAP_EXHAUSTION_THRESHOLD_MB) return null;
        return {
          severity: 'critical',
          title: 'Resource exhaustion',
          message: `Heap usage at ${system.memory.heapUsedMb}MB, exceeding ${HEAP_EXHAUSTION_THRESHOLD_MB}MB threshold`,
          details: system.memory,
        };
      },
    };
  }

  private criticalErrorsRule(): AlertRule {
    return {
      id: 'critical-errors',
      title: 'Critical error burst',
      severity: 'critical',
      cooldownMs: CRITICAL_EXCEPTION_WINDOW_MS,
      evaluate: async () => {
        const overallErrorRate = this.metricsRegistryService.getOverallErrorRate();
        const recentExceptionCount = this.diagnosticsService
          .getRecentExceptions()
          .filter((e) => Date.now() - new Date(e.occurredAt).getTime() < CRITICAL_EXCEPTION_WINDOW_MS).length;

        if (recentExceptionCount < CRITICAL_EXCEPTION_BURST_THRESHOLD && overallErrorRate < HIGH_ERROR_RATE_THRESHOLD) {
          return null;
        }

        return {
          severity: 'critical',
          title: 'Critical error burst',
          message: `${recentExceptionCount} exceptions in the last 5 minutes (error rate ${(overallErrorRate * 100).toFixed(1)}%)`,
          details: { recentExceptionCount, overallErrorRate },
        };
      },
    };
  }
}
