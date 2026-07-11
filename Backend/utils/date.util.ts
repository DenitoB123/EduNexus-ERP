export class DateUtil {
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  static addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  static startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  static endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  static isBetween(date: Date, start: Date, end: Date): boolean {
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
  }

  static diffInDays(a: Date, b: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((a.getTime() - b.getTime()) / msPerDay);
  }

  static toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
