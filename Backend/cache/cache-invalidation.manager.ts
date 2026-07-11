import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { CacheKeys } from './cache-keys';

@Injectable()
export class CacheInvalidationManager {
  constructor(private readonly redisService: RedisService) {}

  private tagSetKey(tag: string): string {
    return CacheKeys.build('cache-tags', tag);
  }

  async tagKey(key: string, tags: string[]): Promise<void> {
    const client = this.redisService.getClient();
    await Promise.all(tags.map((tag) => client.sadd(this.tagSetKey(tag), key)));
  }

  async invalidateTag(tag: string): Promise<number> {
    const client = this.redisService.getClient();
    const keys = await client.smembers(this.tagSetKey(tag));
    if (keys.length === 0) return 0;

    const removed = await client.del(...keys);
    await client.del(this.tagSetKey(tag));
    return removed;
  }

  async invalidateTags(tags: string[]): Promise<number> {
    const results = await Promise.all(tags.map((tag) => this.invalidateTag(tag)));
    return results.reduce((sum, n) => sum + n, 0);
  }
}
