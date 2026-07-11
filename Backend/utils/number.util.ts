export class NumberUtil {
  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  static round(value: number, decimals = 2): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  static isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  static toCurrency(value: number, currency = 'USD', locale = 'en-US'): string {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  }
}
