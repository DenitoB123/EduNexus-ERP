/**
 * delay-calculation.util.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 */

export class DelayCalculationUtil {
  /** Delay in ms from now until `runAt`. Never negative — a past date runs immediately. */
  static msUntil(runAt: Date): number {
    return Math.max(0, runAt.getTime() - Date.now());
  }

  /** Builds a synthetic cron-like task name for a calendar-scheduled date so each occurrence has a stable, listable identity. */
  static calendarTaskName(baseName: string, date: Date): string {
    return `${baseName}:${date.toISOString()}`;
  }
}
