/**
 * mapping-cache.util.ts
 *
 * B2.6 "Performance" requirement: mapping/reflection/metadata caching to
 * reduce repeated `Reflect.getMetadataKeys`/`getOwnPropertyNames` work and
 * object allocation for hot mapping paths. Generic memoization cache used
 * by property-discovery.util.ts below; kept separate/reusable rather than
 * hardcoded into any one mapper.
 */

export class MemoCache<TKey, TValue> {
  private readonly store = new Map<TKey, TValue>();

  getOrCompute(key: TKey, compute: () => TValue): TValue {
    const cached = this.store.get(key);
    if (cached !== undefined) return cached;
    const computed = compute();
    this.store.set(key, computed);
    return computed;
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
