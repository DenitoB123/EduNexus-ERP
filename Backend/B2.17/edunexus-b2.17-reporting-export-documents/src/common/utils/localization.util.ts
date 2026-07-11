import { NumberUtil } from './number.util';
import { DateFormatterUtil } from './date-formatter.util';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../constants/localization.constants';

/**
 * B2.17 addition. Thin composition layer, not a new i18n system —
 * EduNexus has no translated-string catalog yet (out of scope here);
 * this only standardizes *locale-aware formatting* of numbers,
 * currency, and dates for reports/documents, reusing
 * `NumberUtil.toCurrency()` (already existed) rather than
 * reimplementing currency formatting.
 */
export class LocalizationUtil {
  static resolveLocale(requested?: string): string {
    if (requested && (SUPPORTED_LOCALES as readonly string[]).includes(requested)) return requested;
    return DEFAULT_LOCALE;
  }

  static formatCurrency(amount: number, currencyCode = 'KES', locale?: string): string {
    return NumberUtil.toCurrency(amount, currencyCode, LocalizationUtil.resolveLocale(locale));
  }

  static formatNumber(value: number, locale?: string): string {
    return new Intl.NumberFormat(LocalizationUtil.resolveLocale(locale)).format(value);
  }

  static formatDate(date: Date | string, locale?: string): string {
    return DateFormatterUtil.long(date, LocalizationUtil.resolveLocale(locale));
  }
}
