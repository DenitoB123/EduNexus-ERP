export class ObjectUtil {
  static pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
      if (key in obj) result[key] = obj[key];
    }
    return result;
  }

  static omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj };
    for (const key of keys) {
      delete result[key];
    }
    return result;
  }

  static isEmpty(obj: Record<string, unknown> | null | undefined): boolean {
    return !obj || Object.keys(obj).length === 0;
  }

  static deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const result: Record<string, unknown> = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value) && typeof result[key] === 'object') {
        result[key] = this.deepMerge(result[key] as Record<string, unknown>, value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result as T;
  }
}
