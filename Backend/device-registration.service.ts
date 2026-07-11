import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { CacheKeys } from '../cache/cache-keys';

/**
 * "subjectId" is an opaque identifier supplied by the caller (e.g. a
 * future Users module would pass a user id). This subsystem has no
 * knowledge of Users/Auth — it only stores/retrieves token sets.
 */
@Injectable()
export class DeviceRegistrationService {
  constructor(private readonly cacheService: CacheService) {}

  private key(subjectId: string): string {
    return CacheKeys.build('push-devices', subjectId);
  }

  async register(subjectId: string, deviceToken: string): Promise<void> {
    const tokens = await this.getTokens(subjectId);
    if (!tokens.includes(deviceToken)) {
      tokens.push(deviceToken);
      await this.cacheService.setNoExpiry(this.key(subjectId), tokens);
    }
  }

  async unregister(subjectId: string, deviceToken: string): Promise<void> {
    const tokens = await this.getTokens(subjectId);
    const filtered = tokens.filter((t) => t !== deviceToken);
    await this.cacheService.setNoExpiry(this.key(subjectId), filtered);
  }

  async getTokens(subjectId: string): Promise<string[]> {
    return (await this.cacheService.get<string[]>(this.key(subjectId))) ?? [];
  }
}
