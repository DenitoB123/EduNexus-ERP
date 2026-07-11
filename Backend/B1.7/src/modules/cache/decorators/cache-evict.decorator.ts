import { SetMetadata } from '@nestjs/common';
import { CACHE_EVICT_METADATA } from '../cache.constants';

/**
 * Marks a method as one that invalidates a cache key/pattern after it runs
 * successfully (e.g. an update/delete endpoint). `keyPattern` supports the
 * same {paramName} placeholders as @Cacheable and may end in '*' to evict a
 * whole family of keys via CacheService.invalidatePattern.
 *
 * Usage:
 *   @CacheEvict({ keyPattern: 'school:{schoolId}:settings' })
 *   async updateSettings(schoolId: string, dto: UpdateSettingsDto) { ... }
 */
export const CacheEvict = (options: { keyPattern: string }) =>
  SetMetadata(CACHE_EVICT_METADATA, options.keyPattern);
