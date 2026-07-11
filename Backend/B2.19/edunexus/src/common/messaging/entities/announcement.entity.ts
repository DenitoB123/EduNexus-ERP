import { BaseCommEntity } from './base-comm-entity.interface';
import { AnnouncementAudienceType } from '../enums/announcement-audience-type.enum';

/** `audienceFilter` shape is deliberately open (`Record<string, unknown>`) — see `AudienceFilter` in `interfaces/communication/announcement-service.interface.ts` for the documented, still-flexible convention. */
export interface AnnouncementEntity extends BaseCommEntity {
  title: string;
  body: string;
  audienceType: AnnouncementAudienceType;
  audienceFilter: Record<string, unknown> | null;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  isPublished: boolean;
}
