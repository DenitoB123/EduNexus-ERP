import { registerAs } from '@nestjs/config';

export interface CacheConfig {
  defaultTtlSeconds: number;
  keyPrefix: string;
}

export default registerAs('cache', (): CacheConfig => ({
  defaultTtlSeconds: parseInt(process.env.CACHE_DEFAULT_TTL_SECONDS ?? '300', 10),
  keyPrefix: process.env.CACHE_KEY_PREFIX ?? 'cache',
}));
