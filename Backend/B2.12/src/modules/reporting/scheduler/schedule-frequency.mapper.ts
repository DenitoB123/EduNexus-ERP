import { ScheduleFrequency } from '../constants/schedule-frequency.enum';

/**
 * Translates the friendly ScheduleFrequency enum into a cron
 * expression consumable by CronService (infrastructure/scheduler).
 * CUSTOM frequency passes the user-supplied cron expression through
 * unchanged (validated by CreateScheduledReportDto /
 * SchedulerUtils.isValidCronExpression at the CronService layer).
 *
 * Fixed run times (02:00 for daily/weekly/monthly/yearly) keep report
 * generation off peak hours by default; this can be made configurable
 * per-schedule in a future iteration without changing the contract.
 */
export class ScheduleFrequencyMapper {
  static toCronExpression(frequency: ScheduleFrequency, customExpression?: string): string {
    switch (frequency) {
      case ScheduleFrequency.DAILY:
        return '0 2 * * *';
      case ScheduleFrequency.WEEKLY:
        return '0 2 * * 1';
      case ScheduleFrequency.MONTHLY:
        return '0 2 1 * *';
      case ScheduleFrequency.YEARLY:
        return '0 2 1 1 *';
      case ScheduleFrequency.CUSTOM:
        if (!customExpression) {
          throw new Error('A cron expression is required for CUSTOM frequency schedules');
        }
        return customExpression;
      default:
        throw new Error(`Unsupported schedule frequency "${frequency}"`);
    }
  }
}
