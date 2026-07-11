import { Injectable } from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { IPresenceService, PresenceSnapshot } from '../interfaces/communication/presence-service.interface';
import { PresenceStatus } from '../messaging/enums/presence-status.enum';

const PRESENCE_KEY_PREFIX = 'comm:presence';
/** A participant with no heartbeat/status update for this long is treated as implicitly offline even if their last explicit status wasn't OFFLINE. */
const PRESENCE_TTL_SECONDS = 5 * 60;

/**
 * Presence is ephemeral, high-churn state — deliberately kept in
 * Redis (via the existing `RedisService`, infrastructure/redis, B1.x)
 * with a TTL, not a Prisma table. A status key naturally expires back
 * to "unknown" (treated as OFFLINE) if nothing refreshes it, which is
 * exactly the semantics presence needs and a durable table would
 * require a separate cleanup job for.
 */
@Injectable()
export class PresenceService implements IPresenceService {
  constructor(private readonly redis: RedisService) {}

  async setStatus(participantId: string, tenantId: string, status: PresenceStatus): Promise<void> {
    await this.redis.set(this.statusKey(tenantId, participantId), status, PRESENCE_TTL_SECONDS);
    await this.redis.set(this.lastSeenKey(tenantId, participantId), new Date().toISOString());
  }

  async getStatus(participantId: string, tenantId: string): Promise<PresenceSnapshot> {
    const [status, lastSeenRaw] = await Promise.all([
      this.redis.get(this.statusKey(tenantId, participantId)),
      this.redis.get(this.lastSeenKey(tenantId, participantId)),
    ]);

    return {
      participantId,
      status: (status as PresenceStatus | null) ?? PresenceStatus.OFFLINE,
      lastSeenAt: lastSeenRaw ? new Date(lastSeenRaw) : null,
    };
  }

  async getBulkStatus(participantIds: string[], tenantId: string): Promise<PresenceSnapshot[]> {
    if (participantIds.length === 0) return [];

    const client = this.redis.getClient();
    const statusKeys = participantIds.map((id) => this.statusKey(tenantId, id));
    const lastSeenKeys = participantIds.map((id) => this.lastSeenKey(tenantId, id));

    const [statuses, lastSeens] = await Promise.all([client.mget(...statusKeys), client.mget(...lastSeenKeys)]);

    return participantIds.map((participantId, index) => ({
      participantId,
      status: (statuses[index] as PresenceStatus | null) ?? PresenceStatus.OFFLINE,
      lastSeenAt: lastSeens[index] ? new Date(lastSeens[index] as string) : null,
    }));
  }

  async heartbeat(participantId: string, tenantId: string): Promise<void> {
    const current = await this.redis.get(this.statusKey(tenantId, participantId));
    // A heartbeat refreshes the TTL/last-seen without overriding an explicit AWAY/BUSY/INVISIBLE status the participant chose.
    await this.setStatus(participantId, tenantId, (current as PresenceStatus | null) ?? PresenceStatus.ONLINE);
  }

  async goOffline(participantId: string, tenantId: string): Promise<void> {
    await this.redis.del(this.statusKey(tenantId, participantId));
    await this.redis.set(this.lastSeenKey(tenantId, participantId), new Date().toISOString());
  }

  private statusKey(tenantId: string, participantId: string): string {
    return `${PRESENCE_KEY_PREFIX}:status:${tenantId}:${participantId}`;
  }

  private lastSeenKey(tenantId: string, participantId: string): string {
    return `${PRESENCE_KEY_PREFIX}:last-seen:${tenantId}:${participantId}`;
  }
}
