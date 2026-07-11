import { OnQueueActive, OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AppLoggerService } from '../../../common/logger/logger.service';
import { GenerateReportJobData, JOB_NAMES, JOB_QUEUES } from '../jobs.constants';

/**
 * ReportsProcessor
 * ─────────────────────────────────────────────────────────────────────────────
 * Consumes the 'reports' queue. Report generation can be slow (PDF/Excel
 * rendering, large aggregations) — that's exactly why it's a background job
 * rather than a synchronous request. The generated artifact is expected to
 * end up in the File module (StoredFile) so the eventual download flow reuses
 * the same signed-URL access control as any other uploaded file.
 */
@Processor(JOB_QUEUES.REPORTS)
export class ReportsProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  @Process(JOB_NAMES.GENERATE_REPORT)
  async handleGenerateReport(job: Job<GenerateReportJobData>): Promise<{ reportType: string }> {
    return this.generate(job.data);
  }

  @OnQueueActive()
  async onActive(job: Job<GenerateReportJobData>): Promise<void> {
    await this.syncStatus(job, JobStatus.ACTIVE);
  }

  @OnQueueCompleted()
  async onCompleted(
    job: Job<GenerateReportJobData>,
    result: Record<string, unknown>,
  ): Promise<void> {
    await this.syncStatus(job, JobStatus.COMPLETED, { completedAt: new Date(), result });
  }

  @OnQueueFailed()
  async onFailed(job: Job<GenerateReportJobData>, error: Error): Promise<void> {
    this.logger.error(
      `Report job ${job.id} failed (attempt ${job.attemptsMade})`,
      error.stack,
      'ReportsProcessor',
    );
    await this.syncStatus(job, JobStatus.FAILED, { error: error.message });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async generate(data: GenerateReportJobData): Promise<{ reportType: string }> {
    // Integration point: build the report (e.g. via the pdf/xlsx skill
    // pipeline) and persist the artifact through FileService.
    this.logger.log(`Generating report '${data.reportType}'`, 'ReportsProcessor');
    return { reportType: data.reportType };
  }

  private async syncStatus(
    job: Job<GenerateReportJobData>,
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
          'Failed to sync JobQueue status for report job',
          (error as Error)?.stack,
          'ReportsProcessor',
        ),
      );
  }
}
