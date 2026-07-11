import { OnQueueActive, OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AppLoggerService } from '../../../common/logger/logger.service';
import { AiProcessJobData, JOB_NAMES, JOB_QUEUES } from '../jobs.constants';

/**
 * AiProcessingProcessor
 * ─────────────────────────────────────────────────────────────────────────────
 * Consumes the 'ai-processing' queue — reserved for the future Nexa AI
 * features mentioned in the 1.3 spec. Kept as its own queue (rather than
 * folding it into 'reports') because AI calls have a distinct failure mode
 * (provider timeouts/rate limits) and cost profile that benefit from
 * separate concurrency and backoff tuning once Nexa lands.
 */
@Processor(JOB_QUEUES.AI_PROCESSING)
export class AiProcessingProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  @Process(JOB_NAMES.AI_PROCESS)
  async handleAiProcess(job: Job<AiProcessJobData>): Promise<{ task: string }> {
    return this.process(job.data);
  }

  @OnQueueActive()
  async onActive(job: Job<AiProcessJobData>): Promise<void> {
    await this.syncStatus(job, JobStatus.ACTIVE);
  }

  @OnQueueCompleted()
  async onCompleted(job: Job<AiProcessJobData>, result: Record<string, unknown>): Promise<void> {
    await this.syncStatus(job, JobStatus.COMPLETED, { completedAt: new Date(), result });
  }

  @OnQueueFailed()
  async onFailed(job: Job<AiProcessJobData>, error: Error): Promise<void> {
    this.logger.error(
      `AI processing job ${job.id} failed (attempt ${job.attemptsMade})`,
      error.stack,
      'AiProcessingProcessor',
    );
    await this.syncStatus(job, JobStatus.FAILED, { error: error.message });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async process(data: AiProcessJobData): Promise<{ task: string }> {
    // Integration point: future Nexa AI provider call.
    this.logger.log(`Processing AI task '${data.task}'`, 'AiProcessingProcessor');
    return { task: data.task };
  }

  private async syncStatus(
    job: Job<AiProcessJobData>,
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
          'Failed to sync JobQueue status for AI processing job',
          (error as Error)?.stack,
          'AiProcessingProcessor',
        ),
      );
  }
}
