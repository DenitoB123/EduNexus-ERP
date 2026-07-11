import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { HealthAggregatorService } from '../health/health-aggregator.service';
import { MetricsRegistryService } from '../metrics/metrics-registry.service';
import {
  ConfigurationDiagnostic,
  DependencyDiagnostic,
  DiagnosticsReport,
  ExceptionDiagnostic,
  IDiagnosticsService,
  ModuleDiagnostic,
  PerformanceDiagnostic,
} from './interfaces/diagnostics.interface';

const MAX_RECENT_EXCEPTIONS = 100;
const SLOW_ENDPOINT_THRESHOLD_MS = 1000;

@Injectable()
export class DiagnosticsService implements IDiagnosticsService {
  private readonly recentExceptions: ExceptionDiagnostic[] = [];

  constructor(
    private readonly healthAggregatorService: HealthAggregatorService,
    private readonly metricsRegistryService: MetricsRegistryService,
    private readonly configService: AppConfigService,
  ) {}

  /**
   * Extension point: call this from a request-scoped interceptor
   * (see diagnostics-capture.interceptor.ts) or from any catch block
   * that already has the error and correlation id in hand. Not
   * wired into src/common/filters/*.ts automatically — those are
   * B2.2 foundation files this milestone does not modify; see
   * IMPLEMENTATION_SUMMARY_B2_16.md §5 for the one-line change to
   * make at B2.21 to route AllExceptionsFilter through here too.
   */
  captureException(error: Error, context?: Record<string, unknown>, correlationId?: string): void {
    this.recentExceptions.push({
      message: error.message,
      name: error.name,
      stack: error.stack,
      correlationId,
      occurredAt: new Date().toISOString(),
      context,
    });
    if (this.recentExceptions.length > MAX_RECENT_EXCEPTIONS) this.recentExceptions.shift();
  }

  getRecentExceptions(): ExceptionDiagnostic[] {
    return [...this.recentExceptions];
  }

  async runFullDiagnostics(): Promise<DiagnosticsReport> {
    const [dependencies, modules] = await Promise.all([this.checkDependencies(), this.checkModules()]);

    return {
      exceptions: this.getRecentExceptions(),
      dependencies,
      configuration: this.checkConfiguration(),
      modules,
      performance: this.checkPerformance(),
      generatedAt: new Date().toISOString(),
    };
  }

  private async checkDependencies(): Promise<DependencyDiagnostic[]> {
    const results = await this.healthAggregatorService.checkCategory('dependency');
    return results.checks.map((check) => ({
      name: check.name,
      reachable: check.state !== 'down',
      latencyMs: check.durationMs,
      detail: check.message,
    }));
  }

  private async checkModules(): Promise<ModuleDiagnostic[]> {
    // Reuses the same dependency checks, presented as module-level
    // status — the foundation has no formal "module registry" to
    // introspect (NestJS's own ModulesContainer is internal/private
    // API and unstable across versions), so this is deliberately
    // the same source of truth as checkDependencies() rather than a
    // second, divergent implementation.
    const results = await this.healthAggregatorService.checkCategory('dependency');
    return results.checks.map((check) => ({
      module: check.name,
      status: check.state === 'up' ? 'ok' : check.state === 'degraded' ? 'degraded' : 'error',
      detail: check.message,
    }));
  }

  private checkConfiguration(): ConfigurationDiagnostic[] {
    const security = this.configService.security;
    const redis = this.configService.redis;
    const jwt = this.configService.jwt;

    // Presence/default-usage only — never the actual secret values.
    return [
      {
        key: 'security.encryptionKeyHex',
        present: Boolean(security.encryptionKeyHex),
        usingDefault: !security.encryptionKeyHex,
        note: security.encryptionKeyHex ? undefined : 'Ephemeral key generated at boot; set ENCRYPTION_KEY_HEX for production',
      },
      { key: 'redis.host', present: Boolean(redis.host), usingDefault: false },
      { key: 'jwt.secret', present: Boolean(jwt.secret), usingDefault: false },
      { key: 'app.nodeEnv', present: true, usingDefault: false, note: this.configService.app.nodeEnv },
    ];
  }

  private checkPerformance(): PerformanceDiagnostic[] {
    const snapshot = this.metricsRegistryService.getSnapshot().responseTime;

    return Object.entries(snapshot).map(([endpoint, stat]) => ({
      endpoint,
      averageDurationMs: stat.averageDurationMs,
      maxDurationMs: stat.maxDurationMs,
      requestCount: stat.count,
      flagged: stat.averageDurationMs > SLOW_ENDPOINT_THRESHOLD_MS,
      reason: stat.averageDurationMs > SLOW_ENDPOINT_THRESHOLD_MS ? `Average duration exceeds ${SLOW_ENDPOINT_THRESHOLD_MS}ms` : undefined,
    }));
  }
}
