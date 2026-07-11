import { Module, OnModuleInit, Provider } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { JobModule } from '../../infrastructure/jobs/job.module';
import { JobRegistry } from '../../infrastructure/jobs/job-registry.service';

import { ConversationRepository } from './repositories/conversation.repository';
import { ConversationParticipantRepository } from './repositories/conversation-participant.repository';
import { MessageRepository } from './repositories/message.repository';
import { MessageAttachmentRepository } from './repositories/message-attachment.repository';
import { MessageReactionRepository } from './repositories/message-reaction.repository';
import { MessageMentionRepository } from './repositories/message-mention.repository';
import { MessageDeliveryReceiptRepository } from './repositories/message-delivery-receipt.repository';
import { AnnouncementRepository } from './repositories/announcement.repository';
import { ModerationFlagRepository } from './repositories/moderation-flag.repository';
import { CollaborationActivityRepository } from './repositories/collaboration-activity.repository';

import { MessageService } from './message.service';
import { ConversationService } from '../conversations/conversation.service';
import { MessageDeliveryService } from '../delivery/message-delivery.service';
import { PresenceService } from '../presence/presence.service';
import { AnnouncementService } from '../announcements/announcement.service';
import { ModerationService } from '../moderation/moderation.service';
import { CollaborationService } from '../collaboration/collaboration.service';
import { CollaborationActivityListener } from '../collaboration/collaboration-activity.listener';

import { MessageNotificationFanoutJob } from '../delivery/jobs/message-notification-fanout.job';
import { MessageDeliveryRetryJob } from '../delivery/jobs/message-delivery-retry.job';

import { CommunicationNotificationBridge } from '../providers/communication/communication-notification-bridge.service';
import { DefaultAudienceResolver } from '../providers/communication/default-audience-resolver';
import { COMMUNICATION_NOTIFICATION_DISPATCHER } from '../providers/communication/notification-dispatcher.interface';
import { COMMUNICATION_AUDIENCE_RESOLVER } from '../providers/communication/audience-resolver.interface';

const repositoryProviders: Provider[] = [
  {
    provide: ConversationRepository,
    useFactory: (prisma: PrismaService) => new ConversationRepository(prisma.conversation),
    inject: [PrismaService],
  },
  {
    provide: ConversationParticipantRepository,
    useFactory: (prisma: PrismaService) => new ConversationParticipantRepository(prisma.conversationParticipant),
    inject: [PrismaService],
  },
  {
    provide: MessageRepository,
    useFactory: (prisma: PrismaService) => new MessageRepository(prisma.message),
    inject: [PrismaService],
  },
  {
    provide: MessageAttachmentRepository,
    useFactory: (prisma: PrismaService) => new MessageAttachmentRepository(prisma.messageAttachment),
    inject: [PrismaService],
  },
  {
    provide: MessageReactionRepository,
    useFactory: (prisma: PrismaService) => new MessageReactionRepository(prisma.messageReaction),
    inject: [PrismaService],
  },
  {
    provide: MessageMentionRepository,
    useFactory: (prisma: PrismaService) => new MessageMentionRepository(prisma.messageMention),
    inject: [PrismaService],
  },
  {
    provide: MessageDeliveryReceiptRepository,
    useFactory: (prisma: PrismaService) => new MessageDeliveryReceiptRepository(prisma.messageDeliveryReceipt),
    inject: [PrismaService],
  },
  {
    provide: AnnouncementRepository,
    useFactory: (prisma: PrismaService) => new AnnouncementRepository(prisma.announcement),
    inject: [PrismaService],
  },
  {
    provide: ModerationFlagRepository,
    useFactory: (prisma: PrismaService) => new ModerationFlagRepository(prisma.moderationFlag),
    inject: [PrismaService],
  },
  {
    provide: CollaborationActivityRepository,
    useFactory: (prisma: PrismaService) => new CollaborationActivityRepository(prisma.collaborationActivity),
    inject: [PrismaService],
  },
];

/**
 * `COMMUNICATION_NOTIFICATION_DISPATCHER` and
 * `COMMUNICATION_AUDIENCE_RESOLVER` ARE bound here (unlike B2.8's
 * `CQRS_AUTHORIZATION_PROVIDER`, which is left `@Optional()` with no
 * binding at all) because both have a real, working default — push
 * notifications work today via `PushService`, and the default
 * audience resolver still lets `AnnouncementService` create/publish
 * announcements, it just doesn't fan out to anyone until a real
 * resolver replaces it. A future milestone replaces these bindings
 * (`useClass`/`useValue`) wholesale; nothing else in this module
 * changes when that happens.
 */
const extensionPointProviders: Provider[] = [
  { provide: COMMUNICATION_NOTIFICATION_DISPATCHER, useClass: CommunicationNotificationBridge },
  { provide: COMMUNICATION_AUDIENCE_RESOLVER, useClass: DefaultAudienceResolver },
];

@Module({
  imports: [PrismaModule, JobModule],
  providers: [
    ...repositoryProviders,
    ...extensionPointProviders,
    MessageService,
    ConversationService,
    MessageDeliveryService,
    PresenceService,
    AnnouncementService,
    ModerationService,
    CollaborationService,
    CollaborationActivityListener,
    MessageNotificationFanoutJob,
    MessageDeliveryRetryJob,
  ],
  exports: [
    MessageService,
    ConversationService,
    MessageDeliveryService,
    PresenceService,
    AnnouncementService,
    ModerationService,
    CollaborationService,
  ],
})
export class MessagingModule implements OnModuleInit {
  constructor(
    private readonly jobRegistry: JobRegistry,
    private readonly notificationFanoutJob: MessageNotificationFanoutJob,
    private readonly deliveryRetryJob: MessageDeliveryRetryJob,
  ) {}

  /**
   * `JobRegistry` (infrastructure/jobs, B1.x) has no auto-discovery
   * explorer the way events/CQRS handlers do — registration is
   * manual, so this module does it once at boot rather than every
   * job-emitting call site needing to know about it.
   */
  onModuleInit(): void {
    this.jobRegistry.register(this.notificationFanoutJob);
    this.jobRegistry.register(this.deliveryRetryJob);
  }
}
