import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AppLoggerService } from '../../common/logger/logger.service';
import { TenantContextService } from '../../database/context/tenant-context.service';
import { CACHE_NAMESPACE, DEFAULT_CACHE_TTL_SECONDS } from './cache.constants';
import { CACHE_REDIS_CLIENT } from './cache.module';

export interface CacheSetOptions {
  /** Time-to-live in seconds. Defaults to DEFAULT_CACHE_TTL_SECONDS. */
  ttl?: number;
  /**
   * If true (default), the active tenant id (from TenantContextService) is
   * folded into the key so two schools never read/write each other's cache
   * entries under the same logical key. Set to false only for genuinely
   * tenant-agnostic data (e.g. global feature flag definitions).
   */
  tenantScoped?: boolean;
}

/**
 * CacheService
 * ─────────────────────────────────────────────────────────────────────────────
 * Tenant-aware, JSON-aware cache-aside layer over Redis.
 *
 * IMPORTANT — why this doesn't reuse src/infrastructure/redis/redis.service.ts:
 * that RedisService/RedisModule pair exists on disk (Milestone 1.2) but is
 * NOT imported anywhere in app.module.ts, and its constructor depends on an
 * AppConfigService/AppLoggerService pair that no currently-wired module
 * actually provides (there are two same-named-but-different classes for
 * each, split across milestones 1.2 and 1.3 — see GAP_ANALYSIS.md). Building
 * on top of it would mean either silently fixing milestone-1.2 infrastructure
 * files (out of scope for this milestone per the brief) or shipping a Cache
 * module that fails at bootstrap. So CacheModule opens its own small,
 * dedicated ioredis connection the same way JobsModule already does for
 * Bull (reading REDIS_HOST/PORT/PASSWORD/DB directly via ConfigService) —
 * see cache.module.ts. This is flagged in GAP_ANALYSIS.md as a cleanup item;
 * once RedisService is repaired, CacheService can be pointed at it instead
 * with no change to its public API.
 */
@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: AppLoggerService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async get<T>(key: string, options: { tenantScoped?: boolean } = {}): Promise<T | null> {
    const fullKey = this.buildKey(key, options.tenantScoped ?? true);
    try {
      const raw = await this.redis.get(fullKey);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.error(`Cache GET failed for key '${fullKey}'`, (error as Error)?.stack);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheSetOptions = {}): Promise<void> {
    const fullKey = this.buildKey(key, options.tenantScoped ?? true);
    const ttl = options.ttl ?? DEFAULT_CACHE_TTL_SECONDS;
    try {
      await this.redis.set(fullKey, JSON.stringify(value), 'EX', ttl);
    } catch (error) {
      this.logger.error(`Cache SET failed for key '${fullKey}'`, (error as Error)?.stack);
    }
  }

  async del(key: string, options: { tenantScoped?: boolean } = {}): Promise<void> {
    const fullKey = this.buildKey(key, options.tenantScoped ?? true);
    try {
      await this.redis.del(fullKey);
    } catch (error) {
      this.logger.error(`Cache DEL failed for key '${fullKey}'`, (error as Error)?.stack);
    }
  }

  /**
   * Deletes every key matching a glob pattern (e.g. 'feature-flags:*').
   * Uses SCAN rather than KEYS so it never blocks Redis on large datasets.
   * Pattern is namespaced the same way set()/get() are.
   */
  async invalidatePattern(pattern: string, options: { tenantScoped?: boolean } = {}): Promise<number> {
    const fullPattern = this.buildKey(pattern, options.tenantScoped ?? true);
    let cursor = '0';
    let deleted = 0;

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', fullPattern, 'COUNT', 200);
      cursor = nextCursor;
      if (keys.length > 0) {
        deleted += await this.redis.del(...keys);
      }
    } while (cursor !== '0');

    return deleted;
  }

  /**
   * Cache-aside helper: returns the cached value if present, otherwise calls
   * `loader`, caches the result, and returns it. The common case for
   * read-heavy, rarely-changing lookups (school settings, permission sets,
   * feature flag resolution).
   */
  async wrap<T>(key: string, loader: () => Promise<T>, options: CacheSetOptions = {}): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) return cached;

    const fresh = await loader();
    await this.set(key, fresh, options);
    return fresh;
  }

  async increment(key: string, by = 1, options: { tenantScoped?: boolean; ttl?: number } = {}): Promise<number> {
    const fullKey = this.buildKey(key, options.tenantScoped ?? true);
    const value = await this.redis.incrby(fullKey, by);
    if (options.ttl) {
      await this.redis.expire(fullKey, options.ttl);
    }
    return value;
  }

  async isHealthy(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  private buildKey(key: string, tenantScoped: boolean): string {
    const tenantId = tenantScoped ? this.tenantContext.getTenantId() : undefined;
    const segments = [CACHE_NAMESPACE, tenantId ?? 'global', key];
    return segments.join(':');
  }
}
