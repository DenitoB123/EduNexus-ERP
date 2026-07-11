import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheManager } from './cache-manager';
import { CacheInvalidationManager } from './cache-invalidation.manager';
import { DistributedLockService } from './distributed-lock.service';
import { SessionCacheService } from './session-cache.service';
import { CacheableInterceptor } from './cache.decorators';

@Global()
@Module({
  providers: [
    CacheService,
    CacheManager,
    CacheInvalidationManager,
    DistributedLockService,
    SessionCacheService,
    CacheableInterceptor,
  ],
  exports: [
    CacheService,
    CacheManager,
    CacheInvalidationManager,
    DistributedLockService,
    SessionCacheService,
    CacheableInterceptor,
  ],
})
export class CacheModule {}
