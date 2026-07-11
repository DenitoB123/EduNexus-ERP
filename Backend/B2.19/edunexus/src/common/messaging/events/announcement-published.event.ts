import { DomainEvent } from '../../base/domain-event';
import { AnnouncementAudienceType } from '../enums/announcement-audience-type.enum';

export class AnnouncementPublishedEvent extends DomainEvent {
  constructor(
    public readonly announcementId: string,
    public readonly audienceType: AnnouncementAudienceType,
    tenantId: string,
  ) {
    super('messaging.announcement.published');
    this.tenantId = tenantId;
  }
}
