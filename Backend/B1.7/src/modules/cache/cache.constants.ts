export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';
export const CACHE_EVICT_METADATA = 'cache:evict';

/** Default TTL (seconds) applied when @Cacheable() doesn't specify one. */
export const DEFAULT_CACHE_TTL_SECONDS = 300;

/** Namespacing prefix so cache keys never collide with other ioredis key usage (queues, sessions, etc.). */
export const CACHE_NAMESPACE = 'cache';
