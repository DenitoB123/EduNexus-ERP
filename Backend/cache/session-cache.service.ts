import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheKeys } from './cache-keys';
import { TtlManager } from './ttl-manager';

@Injectable()
export class SessionCacheService<T = Record<string, unknown>> {
  constructor(private readonly cacheService: CacheService) {}

  private key(sessionId: string): string {
    return CacheKeys.build('session', sessionId);
  }

  async get(sessionId: string): Promise<T | null> {
    return this.cacheService.get<T>(this.key(sessionId));
  }

  async set(sessionId: string, data: T, ttlSeconds = TtlManager.resolve('session')): Promise<void> {
    await this.cacheService.set(this.key(sessionId), data, ttlSeconds);
  }

  async touch(sessionId: string, ttlSeconds = TtlManager.resolve('session')): Promise<void> {
    if (ttlSeconds) {
      await this.cacheService.expire(this.key(sessionId), ttlSeconds);
    }
  }

  async destroy(sessionId: string): Promise<void> {
    await this.cacheService.del(this.key(sessionId));
  }
}
