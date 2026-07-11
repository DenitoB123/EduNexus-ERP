import { SetMetadata, applyDecorators } from '@nestjs/common';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '../cache.constants';

export interface CacheableOptions {
  /** Static key, or a template using {paramName} placeholders resolved from method arguments by name (see CacheInterceptor). */
  key: string;
  ttl?: number;
}

/**
 * Marks a method (typically a service method called from a controller, or
 * any class method invoked through Nest's DI/interceptor pipeline) so
 * CacheInterceptor short-circuits it with a cached value when available,
 * and stores the result after a real call.
 *
 * Usage:
 *   @Cacheable({ key: 'school:{schoolId}:settings', ttl: 600 })
 *   async getSettings(schoolId: string) { ... }
 */
export const Cacheable = (options: CacheableOptions) =>
  applyDecorators(
    SetMetadata(CACHE_KEY_METADATA, options.key),
    SetMetadata(CACHE_TTL_METADATA, options.ttl),
  );
