export type StartupCheckStatus = 'up' | 'down' | 'skipped';

export interface StartupCheckResult {
  name: string;
  status: StartupCheckStatus;
  critical: boolean;
  durationMs: number;
  error?: string;
}

export interface StartupVerificationReport {
  healthy: boolean;
  checks: StartupCheckResult[];
  startedAt: Date;
  completedAt: Date;
}

/**
 * Runs a battery of startup connectivity/readiness checks and returns
 * a structured report. Implemented by StartupVerifierService, which
 * deliberately composes the EXISTING health indicators
 * (PrismaHealthIndicator, RedisHealthIndicator, RabbitMQHealthIndicator,
 * QueueHealthIndicator, StorageHealthIndicator from health/ and
 * infrastructure/monitoring/) rather than re-implementing connectivity
 * checks — this interface is the "run all of them once, at boot,
 * and fail fast on critical ones" orchestration layer on top.
 */
export interface IStartupVerifier {
  verify(): Promise<StartupVerificationReport>;
}
