import { OnQueueActive, OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AppLoggerService } from '../../../common/logger/logger.service';
import { JOB_NAMES, JOB_QUEUES, SendNotificationJobData } from '../jobs.constants';

/**
 * NotificationsProcessor
 * ─────────────────────────────────────────────────────────────────────────────
 * Consumes the 'notifications' queue (in-app / push notifications). The
 * delivery mechanism (push provider, in-app feed write, websocket emit) is
 * left as a single integration point in deliver().
 */
@Processor(JOB_QUEUES.NOTIFICATIONS)
export class NotificationsProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  @Process(JOB_NAMES.SEND_NOTIFICATION)
  async handleSendNotification(job: Job<SendNotificationJobData>): Promise<void> {
    await this.deliver(job.data);
  }

  @OnQueueActive()
  async onActive(job: Job<SendNotificationJobData>): Promise<void> {
    await this.syncStatus(job, JobStatus.ACTIVE);
  }

  @OnQueueCompleted()
  async onCompleted(job: Job<SendNotificationJobData>): Promise<void> {
    await this.syncStatus(job, JobStatus.COMPLETED, { completedAt: new Date() });
  }

  @OnQueueFailed()
  async onFailed(job: Job<SendNotificationJobData>, error: Error): Promise<void> {
    this.logger.error(
      `Notification job ${job.id} failed (attempt ${job.attemptsMade})`,
      error.stack,
      'NotificationsProcessor',
    );
    await this.syncStatus(job, JobStatus.FAILED, { error: error.message });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async deliver(data: SendNotificationJobData): Promise<void> {
    // Integration point: push provider / in-app feed write / websocket emit.
    this.logger.log(
      `Delivering notification to user ${data.userId}: ${data.title}`,
      'NotificationsProcessor',
    );
  }

  private async syncStatus(
    job: Job<SendNotificationJobData>,
    status: JobStatus,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    await this.prisma.jobQueue
      .updateMany({
        where: { bullJobId: String(job.id) },
        data: { status, attempts: job.attemptsMade, ...extra },
      })
      .catch((error: Error) =>
        this.logger.error(
          'Failed to sync JobQueue status for notification job',
          (error as Error)?.stack,
          'NotificationsProcessor',
        ),
      );
  }
}
