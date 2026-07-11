/**
 * circular-reference.guard.ts
 *
 * Cycle-safe deep clone/walk for PLAIN objects (already-serialized data,
 * or objects without class-transformer decorators). Decorated class
 * instances go through `instanceToPlain`, which class-transformer already
 * handles safely; this guard covers the remaining case B2.6 explicitly
 * calls out: "Circular reference protection" for arbitrary nested objects.
 */

export function stripCircular<T>(input: T): T {
  const seen = new WeakSet<object>();

  const walk = (value: unknown): unknown => {
    if (value === null || typeof value !== 'object') return value;

    if (seen.has(value as object)) {
      return '[Circular]';
    }
    seen.add(value as object);

    if (Array.isArray(value)) {
      return value.map((item) => walk(item));
    }

    if (value instanceof Date) return value;

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = walk(val);
    }
    return result;
  };

  return walk(input) as T;
}
