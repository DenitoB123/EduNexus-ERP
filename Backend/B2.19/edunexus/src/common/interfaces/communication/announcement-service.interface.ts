import { QueryOptions, PaginatedResult } from '../../../database/interfaces/base-model.interface';
import { AnnouncementEntity } from '../../messaging/entities/announcement.entity';
import { CreateAnnouncementInput } from '../../messaging/dto/create-announcement.dto';

export interface IAnnouncementService {
  createAnnouncement(
    input: CreateAnnouncementInput,
    tenantId: string,
    actorId: string,
  ): Promise<AnnouncementEntity>;

  publishAnnouncement(id: string, tenantId: string, actorId: string): Promise<AnnouncementEntity>;

  /** Publishes every announcement whose `scheduledAt` has passed and isn't published yet — intended to be called by a scheduled job. */
  publishDueScheduled(tenantId: string): Promise<number>;

  listAnnouncements(tenantId: string, options?: QueryOptions): Promise<PaginatedResult<AnnouncementEntity>>;
}
