import { HealthCheckResult, HealthState } from '../interfaces/health-checker.interface';

type PartialCheckOutcome = { state: HealthState; message?: string; details?: Record<string, unknown> };

/** Wraps a checker's core logic with timing + timestamp bookkeeping so each IHealthChecker only supplies its own status logic. */
export async function timedCheck(name: string, run: () => Promise<PartialCheckOutcome>): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const outcome = await run();
    return { name, checkedAt: new Date().toISOString(), durationMs: Date.now() - start, ...outcome };
  } catch (error) {
    return {
      name,
      state: 'down',
      message: error instanceof Error ? error.message : 'Health check threw an unexpected error',
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
    };
  }
}
