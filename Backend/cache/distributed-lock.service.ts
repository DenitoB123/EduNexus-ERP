import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export interface AcquiredLock {
  key: string;
  token: string;
}

@Injectable()
export class DistributedLockService {
  constructor(
    private readonly redisService: RedisService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('DistributedLockService');
  }

  async acquire(key: string, ttlMs = 10000): Promise<AcquiredLock | null> {
    const token = randomUUID();
    const result = await this.redisService
      .getClient()
      .set(key, token, 'PX', ttlMs, 'NX');

    if (result !== 'OK') {
      return null;
    }

    return { key, token };
  }

  async release(lock: AcquiredLock): Promise<boolean> {
    const result = await this.redisService
      .getClient()
      .eval(RELEASE_SCRIPT, 1, lock.key, lock.token);

    return result === 1;
  }

  async withLock<T>(key: string, work: () => Promise<T>, ttlMs = 10000): Promise<T> {
    const lock = await this.acquire(key, ttlMs);

    if (!lock) {
      throw new Error(`Could not acquire lock for key "${key}"`);
    }

    try {
      return await work();
    } finally {
      await this.release(lock);
    }
  }
}
