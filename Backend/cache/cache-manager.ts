import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheInvalidationManager } from './cache-invalidation.manager';
import { CacheKeys } from './cache-keys';
import { TtlManager, TtlPolicy } from './ttl-manager';
import { CacheEntryOptions } from '../interfaces/cache.interface';

@Injectable()
export class CacheManager {
  constructor(
    private readonly cacheService: CacheService,
    private readonly invalidationManager: CacheInvalidationManager,
  ) {}

  async remember<T>(
    keyParts: Array<string | number>,
    factory: () => Promise<T>,
    options?: CacheEntryOptions & { ttlPolicy?: TtlPolicy },
  ): Promise<T> {
    const key = CacheKeys.build(...keyParts);
    const ttl = options?.ttlSeconds ?? TtlManager.resolve(options?.ttlPolicy ?? 'default');

    const value = await this.cacheService.wrap(key, factory, ttl);

    if (options?.tags?.length) {
      await this.invalidationManager.tagKey(key, options.tags);
    }

    return value;
  }

  forget(keyParts: Array<string | number>): Promise<void> {
    return this.cacheService.del(CacheKeys.build(...keyParts));
  }

  forgetTag(tag: string): Promise<number> {
    return this.invalidationManager.invalidateTag(tag);
  }

  forgetTags(tags: string[]): Promise<number> {
    return this.invalidationManager.invalidateTags(tags);
  }

  invalidatePattern(pattern: string): Promise<number> {
    return this.cacheService.invalidatePattern(pattern);
  }
}
