import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { ICacheService } from '../interfaces/cache.interface';
import { CacheUtils } from './cache.utils';
import { TtlManager } from './ttl-manager';

@Injectable()
export class CacheService implements ICacheService {
  constructor(
    private readonly redisService: RedisService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('CacheService');
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.redisService.get(key);
    return CacheUtils.deserialize<T>(raw);
  }

  async set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const resolvedTtl = ttlSeconds ?? TtlManager.resolve('default');
    await this.redisService.set(key, CacheUtils.serialize(value), resolvedTtl);
  }

  async setNoExpiry<T = unknown>(key: string, value: T): Promise<void> {
    await this.redisService.set(key, CacheUtils.serialize(value));
  }

  async del(key: string): Promise<void> {
    await this.redisService.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.redisService.exists(key);
  }

  async wrap<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await factory();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  async invalidatePattern(pattern: string): Promise<number> {
    const client = this.redisService.getClient();
    let cursor = '0';
    let removed = 0;

    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = nextCursor;
      if (keys.length > 0) {
        removed += await client.del(...keys);
      }
    } while (cursor !== '0');

    this.logger.debug(`Invalidated ${removed} keys matching pattern "${pattern}"`);
    return removed;
  }

  async increment(key: string, by = 1): Promise<number> {
    return this.redisService.getClient().incrby(key, by);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.redisService.getClient().expire(key, ttlSeconds);
  }
}
