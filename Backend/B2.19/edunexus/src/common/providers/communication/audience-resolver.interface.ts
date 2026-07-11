import { AnnouncementEntity } from '../../messaging/entities/announcement.entity';

/**
 * Resolves an `Announcement`'s `audienceType`/`audienceFilter` into a
 * concrete list of participant IDs to notify. No implementation is
 * registered by B2.19 for the same reason as `IContactResolver` —
 * resolving "all Grade 10 students" or "everyone in the Finance
 * department" needs domain models this branch doesn't have yet. The
 * default resolver (`providers/communication/default-audience-resolver.ts`)
 * returns an empty list and logs a warning, so `AnnouncementService`
 * still creates and publishes the `Announcement` row (the durable
 * record of what was announced) even before a real resolver exists —
 * only the notification fan-out is a no-op until one is registered.
 */
export interface IAudienceResolver {
  resolve(announcement: AnnouncementEntity, tenantId: string): Promise<string[]>;
}

export const COMMUNICATION_AUDIENCE_RESOLVER = 'COMMUNICATION_AUDIENCE_RESOLVER';
