/**
 * Presence is intentionally NOT a Prisma model — it's ephemeral,
 * high-churn state, so `PresenceService` (common/presence) keeps it
 * in Redis (via the existing `RedisService`/`CacheService`,
 * infrastructure/redis + infrastructure/cache) instead of writing a
 * row to Postgres on every status change.
 */
export enum PresenceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  AWAY = 'AWAY',
  BUSY = 'BUSY',
  INVISIBLE = 'INVISIBLE',
}
