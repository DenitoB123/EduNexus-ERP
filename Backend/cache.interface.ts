export interface ICacheService {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  wrap<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T>;
  invalidatePattern(pattern: string): Promise<number>;
}

export interface CacheEntryOptions {
  ttlSeconds?: number;
  tags?: string[];
}
