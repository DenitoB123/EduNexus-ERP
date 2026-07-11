/**
 * B2.17 addition. common/utils/number.util.ts already has
 * `NumberUtil.toCurrency()` (currency formatting) and
 * `timezone.util.ts` handles timezone conversion — this fills the
 * one gap, date formatting, without touching either.
 */
export class DateFormatterUtil {
  static short(date: Date | string, locale = 'en-US'): string {
    return DateFormatterUtil.toDate(date).toLocaleDateString(locale);
  }

  static long(date: Date | string, locale = 'en-US'): string {
    return DateFormatterUtil.toDate(date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  static withTime(date: Date | string, locale = 'en-US'): string {
    return DateFormatterUtil.toDate(date).toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  static iso(date: Date | string): string {
    return DateFormatterUtil.toDate(date).toISOString();
  }

  /** e.g. "3 days ago", "in 2 hours" — used in report/document history views. */
  static relative(date: Date | string, now: Date = new Date()): string {
    const target = DateFormatterUtil.toDate(date);
    const diffMs = target.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / 60000);

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
    const diffDays = Math.round(diffHours / 24);
    return rtf.format(diffDays, 'day');
  }

  private static toDate(date: Date | string): Date {
    return date instanceof Date ? date : new Date(date);
  }
}
