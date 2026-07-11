/**
 * B2.16 — Enterprise Observability, Monitoring & Diagnostics Framework.
 *
 * IHealthChecker is intentionally NOT the @nestjs/terminus
 * HealthIndicator contract used by src/health/indicators/*.ts. That
 * existing set (Prisma/Redis/RabbitMQ indicators + the two ad-hoc
 * ones under infrastructure/monitoring and security/monitoring) stays
 * exactly as-is — this module does not touch it, and note their
 * @nestjs/terminus import of `HealthIndicatorService` currently fails
 * to compile against the installed terminus version (pre-existing,
 * unrelated to B2.16; see IMPLEMENTATION_SUMMARY_B2_16.md §6).
 *
 * Instead, every IHealthChecker in src/common/health/checkers/*
 * reads the same underlying source-of-truth primitives those
 * indicators use (RedisService.isHealthy(), PrismaService.isHealthy(),
 * RabbitMQService.isHealthy(), DatabaseConnectionManager, etc.) behind
 * a terminus-independent contract, so HealthAggregatorService works
 * whether or not the terminus indicators compile, and so a future
 * fix to those files needs no change here.
 */
export type HealthState = 'up' | 'down' | 'degraded';

export interface HealthCheckResult {
  name: string;
  state: HealthState;
  message?: string;
  details?: Record<string, unknown>;
  checkedAt: string;
  durationMs: number;
}

export interface IHealthChecker {
  /** Stable identifier, e.g. "database", "redis", "rabbitmq". Used as the result key and in alert rule targeting. */
  readonly name: string;
  /** Which composite categories this checker participates in — a checker can back more than one probe. */
  readonly categories: HealthCheckCategory[];
  check(): Promise<HealthCheckResult>;
}

export type HealthCheckCategory = 'liveness' | 'readiness' | 'startup' | 'dependency';

export interface AggregateHealthReport {
  status: HealthState;
  category: HealthCheckCategory;
  checks: HealthCheckResult[];
  generatedAt: string;
}

export const HEALTH_CHECKERS = 'HEALTH_CHECKERS';
