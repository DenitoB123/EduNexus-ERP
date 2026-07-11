import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JOB_QUEUES } from './jobs.constants';
import { EmailProcessor } from './processors/email.processor';
import { NotificationsProcessor } from './processors/notifications.processor';
import { ReportsProcessor } from './processors/reports.processor';
import { AiProcessingProcessor } from './processors/ai-processing.processor';
import { AppConfigService } from '../../config/config.service';

// ─────────────────────────────────────────────────────────────────────────────
// JobsModule — Milestone 1.3
// Bull (Redis-backed) queues for async work: emails, notifications, report
// generation, and AI processing (future Nexa). Each queue has its own
// processor in processors/ so concurrency, retry, and backoff can be tuned
// per workload without affecting the others.
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        redis: {
          host: config.redisHost,
          port: config.redisPort,
          password: config.redisPassword,
          db: config.redisDb,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: JOB_QUEUES.EMAIL },
      { name: JOB_QUEUES.NOTIFICATIONS },
      { name: JOB_QUEUES.REPORTS },
      { name: JOB_QUEUES.AI_PROCESSING },
    ),
  ],
  controllers: [JobsController],
  providers: [
    JobsService,
    EmailProcessor,
    NotificationsProcessor,
    ReportsProcessor,
    AiProcessingProcessor,
  ],
  exports: [JobsService],
})
export class JobsModule {}
