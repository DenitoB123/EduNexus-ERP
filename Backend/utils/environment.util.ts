export class EnvironmentUtil {
  static get(key: string, fallback?: string): string | undefined {
    return process.env[key] ?? fallback;
  }

  static getRequired(key: string): string {
    const value = process.env[key];
    if (value === undefined) {
      throw new Error(`Missing required environment variable "${key}"`);
    }
    return value;
  }

  static getBoolean(key: string, fallback = false): boolean {
    const value = process.env[key];
    if (value === undefined) return fallback;
    return value === 'true' || value === '1';
  }

  static getNumber(key: string, fallback: number): number {
    const value = process.env[key];
    if (value === undefined) return fallback;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
}
