import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { CacheService } from './cache.service';
import { CacheInterceptor } from './interceptors/cache.interceptor';

export const CACHE_REDIS_CLIENT = 'CACHE_REDIS_CLIENT';

// ─────────────────────────────────────────────────────────────────────────────
// CacheModule — Milestone 1.7 (Final Infrastructure Hardening)
//
// Opens its own dedicated ioredis connection using the same
// REDIS_HOST/REDIS_PORT/REDIS_PASSWORD/REDIS_DB env vars JobsModule already
// reads for Bull (Milestone 1.6) — see GAP_ANALYSIS.md for why this does
// NOT reuse src/infrastructure/redis/redis.service.ts (that module is
// present on disk but was never wired into app.module.ts and currently
// cannot bootstrap as written).
//
// Once that's repaired, swap this factory for an injection of RedisService
// and delete this file's client setup — CacheService's public API does not
// need to change either way.
// ─────────────────────────────────────────────────────────────────────────────
@Global()
@Module({
  providers: [
    {
      provide: CACHE_REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD'),
          db: config.get<number>('REDIS_DB', 0),
          keyPrefix: 'edunexus:',
          maxRetriesPerRequest: 5,
          retryStrategy: (attempt: number) => Math.min(attempt * 200, 5000),
        }),
    },
    CacheService,
    CacheInterceptor,
  ],
  exports: [CacheService, CacheInterceptor],
})
export class CacheModule {}
