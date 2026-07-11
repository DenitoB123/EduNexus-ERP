export class JsonHelpers {
  static safeParse<T = unknown>(raw: string): T | null {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  static safeStringify(value: unknown, indent?: number): string {
    try {
      return JSON.stringify(value, null, indent) ?? '';
    } catch {
      return '';
    }
  }

  static deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
