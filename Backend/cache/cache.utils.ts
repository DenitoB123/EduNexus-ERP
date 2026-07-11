export class CacheUtils {
  static serialize<T>(value: T): string {
    return JSON.stringify(value);
  }

  static deserialize<T>(raw: string | null): T | null {
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}
