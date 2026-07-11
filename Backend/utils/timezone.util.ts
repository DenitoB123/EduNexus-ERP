export class TimezoneUtil {
  static toZonedTime(date: Date, timeZone: string): Date {
    const formatted = date.toLocaleString('en-US', { timeZone });
    return new Date(formatted);
  }

  static isValidTimeZone(timeZone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone });
      return true;
    } catch {
      return false;
    }
  }

  static listCommonTimeZones(): string[] {
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Berlin',
      'Asia/Kolkata',
      'Asia/Dubai',
      'Asia/Singapore',
      'Australia/Sydney',
    ];
  }
}
