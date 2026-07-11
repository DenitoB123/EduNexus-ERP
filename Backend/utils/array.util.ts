export class ArrayUtil {
  static chunk<T>(items: T[], size: number): T[][] {
    if (size <= 0) throw new Error('Chunk size must be greater than 0');
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }

  static unique<T>(items: T[]): T[] {
    return Array.from(new Set(items));
  }

  static groupBy<T, K extends string | number>(items: T[], keyFn: (item: T) => K): Record<K, T[]> {
    return items.reduce((acc, item) => {
      const key = keyFn(item);
      (acc[key] ??= []).push(item);
      return acc;
    }, {} as Record<K, T[]>);
  }

  static intersection<T>(a: T[], b: T[]): T[] {
    const setB = new Set(b);
    return a.filter((item) => setB.has(item));
  }

  static difference<T>(a: T[], b: T[]): T[] {
    const setB = new Set(b);
    return a.filter((item) => !setB.has(item));
  }
}
