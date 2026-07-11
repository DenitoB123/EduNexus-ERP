import { Inject, Injectable } from '@nestjs/common';
import { AnnouncementRepository } from '../messaging/repositories/announcement.repository';
import { AnnouncementEntity } from '../messaging/entities/announcement.entity';
import { CreateAnnouncementInput } from '../messaging/dto/create-announcement.dto';
import { AnnouncementPublishedEvent } from '../messaging/events/announcement-published.event';
import { EventBus } from '../../infrastructure/events/event-bus.service';
import { AppLoggerService } from '../logger/app-logger.service';
import { BusinessException } from '../exceptions/business.exception';
import { StringUtil } from '../utils/string.util';
import { QueryOptions, PaginatedResult } from '../../database/interfaces/base-model.interface';
import { IAnnouncementService } from '../interfaces/communication/announcement-service.interface';
import {
  COMMUNICATION_AUDIENCE_RESOLVER,
  IAudienceResolver,
} from '../providers/communication/audience-resolver.interface';
import {
  COMMUNICATION_NOTIFICATION_DISPATCHER,
  INotificationDispatcher,
} from '../providers/communication/notification-dispatcher.interface';

@Injectable()
export class AnnouncementService implements IAnnouncementService {
  constructor(
    private readonly announcementRepository: AnnouncementRepository,
    private readonly eventBus: EventBus,
    private readonly logger: AppLoggerService,
    @Inject(COMMUNICATION_AUDIENCE_RESOLVER) private readonly audienceResolver: IAudienceResolver,
    @Inject(COMMUNICATION_NOTIFICATION_DISPATCHER) private readonly notificationDispatcher: INotificationDispatcher,
  ) {
    this.logger.setContext('AnnouncementService');
  }

  async createAnnouncement(
    input: CreateAnnouncementInput,
    tenantId: string,
    actorId: string,
  ): Promise<AnnouncementEntity> {
    return this.announcementRepository.create(
      {
        title: input.title,
        body: input.body,
        audienceType: input.audienceType,
        audienceFilter: input.audienceFilter ?? null,
        scheduledAt: input.scheduledAt ?? null,
        publishedAt: null,
        isPublished: false,
      },
      tenantId,
      actorId,
    );
  }

  async publishAnnouncement(id: string, tenantId: string, actorId: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementRepository.findById(id, tenantId);
    if (!announcement) {
      throw new BusinessException(`Announcement "${id}" was not found`);
    }
    if (announcement.isPublished) {
      throw new BusinessException(`Announcement "${id}" is already published`);
    }

    const published = await this.announcementRepository.update(
      id,
      { isPublished: true, publishedAt: new Date() },
      tenantId,
      actorId,
    );

    await this.fanOutToAudience(published, tenantId);
    await this.eventBus.emit(new AnnouncementPublishedEvent(published.id, published.audienceType, tenantId));

    return published;
  }

  async publishDueScheduled(tenantId: string): Promise<number> {
    const due = await this.announcementRepository.listDueForPublish(tenantId, new Date());

    for (const announcement of due) {
      await this.publishAnnouncement(announcement.id, tenantId, announcement.createdBy ?? 'system');
    }

    this.logger.log(`Published ${due.length} scheduled announcement(s) for tenant "${tenantId}"`);
    return due.length;
  }

  async listAnnouncements(tenantId: string, options: QueryOptions = {}): Promise<PaginatedResult<AnnouncementEntity>> {
    return this.announcementRepository.findMany(options, tenantId);
  }

  private async fanOutToAudience(announcement: AnnouncementEntity, tenantId: string): Promise<void> {
    const recipientIds = await this.audienceResolver.resolve(announcement, tenantId);
    const preview = StringUtil.truncate(announcement.body, 140);

    const results = await Promise.allSettled(
      recipientIds.map((participantId) =>
        this.notificationDispatcher.notifyParticipant(participantId, tenantId, {
          title: announcement.title,
          body: preview,
          channels: ['push', 'email'],
        }),
      ),
    );

    const failures = results.filter((r) => r.status === 'rejected').length;
    if (failures > 0) {
      this.logger.warn(`${failures}/${recipientIds.length} announcement notifications failed for "${announcement.id}"`);
    }
  }
}
