import { Injectable } from '@nestjs/common';
import { IAudienceResolver } from './audience-resolver.interface';
import { AnnouncementEntity } from '../../messaging/entities/announcement.entity';
import { AppLoggerService } from '../../logger/app-logger.service';

/**
 * Default `IAudienceResolver` — always returns an empty recipient
 * list and logs a warning. `AnnouncementService` still creates and
 * publishes the `Announcement` row regardless (that's the durable
 * record of what was announced and to which audience *type*); only
 * the actual notification fan-out to individual participants is a
 * no-op until a real resolver is registered under
 * `COMMUNICATION_AUDIENCE_RESOLVER`.
 */
@Injectable()
export class DefaultAudienceResolver implements IAudienceResolver {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('DefaultAudienceResolver');
  }

  async resolve(announcement: AnnouncementEntity, _tenantId: string): Promise<string[]> {
    this.logger.warn(
      `No IAudienceResolver registered — announcement "${announcement.id}" (audienceType=${announcement.audienceType}) ` +
        'was published but no participants were notified. Register a resolver under COMMUNICATION_AUDIENCE_RESOLVER.',
    );
    return [];
  }
}
