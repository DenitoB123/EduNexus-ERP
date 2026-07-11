import { OnQueueActive, OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AppLoggerService } from '../../../common/logger/logger.service';
import { JOB_NAMES, JOB_QUEUES, SendEmailJobData } from '../jobs.constants';

/**
 * EmailProcessor
 * ─────────────────────────────────────────────────────────────────────────────
 * Consumes the 'email' queue. Actual delivery is intentionally left as a
 * single integration point (sendViaProvider) — wire in SES/SendGrid/Postmark
 * etc. here without touching the queueing, retry, or JobQueue-sync logic.
 */
@Processor(JOB_QUEUES.EMAIL)
export class EmailProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  @Process(JOB_NAMES.SEND_EMAIL)
  async handleSendEmail(job: Job<SendEmailJobData>): Promise<void> {
    await this.sendViaProvider(job.data);
  }

  @OnQueueActive()
  async onActive(job: Job<SendEmailJobData>): Promise<void> {
    await this.syncStatus(job, JobStatus.ACTIVE);
  }

  @OnQueueCompleted()
  async onCompleted(job: Job<SendEmailJobData>): Promise<void> {
    await this.syncStatus(job, JobStatus.COMPLETED, { completedAt: new Date() });
  }

  @OnQueueFailed()
  async onFailed(job: Job<SendEmailJobData>, error: Error): Promise<void> {
    this.logger.error(
      `Email job ${job.id} failed (attempt ${job.attemptsMade})`,
      error.stack,
      'EmailProcessor',
    );
    await this.syncStatus(job, JobStatus.FAILED, { error: error.message });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async sendViaProvider(data: SendEmailJobData): Promise<void> {
    // Integration point: plug in the real email provider SDK here.
    this.logger.log(
      `Sending email to ${data.to} using template '${data.template}'`,
      'EmailProcessor',
    );
  }

  private async syncStatus(
    job: Job<SendEmailJobData>,
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
          'Failed to sync JobQueue status for email job',
          (error as Error)?.stack,
          'EmailProcessor',
        ),
      );
  }
}
