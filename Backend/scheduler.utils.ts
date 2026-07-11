const CRON_FIELD_PATTERN = /^(\*|[0-9*/,-]+)$/;

export class SchedulerUtils {
  static isValidCronExpression(expression: string): boolean {
    const fields = expression.trim().split(/\s+/);
    if (fields.length < 5 || fields.length > 6) return false;
    return fields.every((field) => CRON_FIELD_PATTERN.test(field));
  }

  static msUntil(date: Date): number {
    return Math.max(0, date.getTime() - Date.now());
  }
}
