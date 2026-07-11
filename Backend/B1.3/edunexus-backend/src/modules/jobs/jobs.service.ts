import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../config/config.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import {
  AiProcessJobData,
  GenerateReportJobData,
  JOB_NAMES,
  JOB_QUEUES,
  SendEmailJobData,
  SendNotificationJobData,
} from './jobs.constants';

/**
 * JobsService
 * ─────────────────────────────────────────────────────────────────────────────
 * Enqueue helper for the four async-processing queues (email, notifications,
 * reports, AI processing). Bull/Redis owns scheduling, retries, and backoff;
 * every enqueue is also mirrored into the JobQueue table so the rest of the
 * app (e.g. an admin "background jobs" dashboard) can query job status
 * without talking to Redis directly.
 */
@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(JOB_QUEUES.EMAIL) private readonly emailQueue: Queue<SendEmailJobData>,
    @InjectQueue(JOB_QUEUES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue<SendNotificationJobData>,
    @InjectQueue(JOB_QUEUES.REPORTS) private readonly reportsQueue: Queue<GenerateReportJobData>,
    @InjectQueue(JOB_QUEUES.AI_PROCESSING)
    private readonly aiQueue: Queue<AiProcessJobData>,
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly logger: AppLoggerService,
  ) {}

  async enqueueEmail(data: SendEmailJobData) {
    return this.enqueue(this.emailQueue, JOB_QUEUES.EMAIL, JOB_NAMES.SEND_EMAIL, data);
  }

  async enqueueNotification(data: SendNotificationJobData) {
    return this.enqueue(
      this.notificationsQueue,
      JOB_QUEUES.NOTIFICATIONS,
      JOB_NAMES.SEND_NOTIFICATION,
      data,
    );
  }

  async enqueueReport(data: GenerateReportJobData) {
    return this.enqueue(this.reportsQueue, JOB_QUEUES.REPORTS, JOB_NAMES.GENERATE_REPORT, data);
  }

  async enqueueAiProcessing(data: AiProcessJobData) {
    return this.enqueue(this.aiQueue, JOB_QUEUES.AI_PROCESSING, JOB_NAMES.AI_PROCESS, data);
  }

  async getStatus(jobQueueId: string) {
    return this.prisma.jobQueue.findUnique({ where: { id: jobQueueId } });
  }

  async listForSchool(schoolId: string | null, page = 1, limit = 25) {
    const skip = (page - 1) * limit;
    const where = { schoolId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.jobQueue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.jobQueue.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async enqueue<T extends { schoolId?: string | null }>(
    queue: Queue<T>,
    queueName: string,
    jobName: string,
    data: T,
  ) {
    const record = await this.prisma.jobQueue.create({
      data: {
        queueName,
        jobName,
        data: data as unknown as Record<string, unknown>,
        status: JobStatus.WAITING,
        maxAttempts: this.config.jobDefaultAttempts,
        schoolId: data.schoolId ?? null,
      },
    });

    try {
      const bullJob = await queue.add(jobName, data, {
        attempts: this.config.jobDefaultAttempts,
        backoff: { type: 'exponential', delay: this.config.jobDefaultBackoffMs },
        removeOnComplete: this.config.jobRemoveOnComplete,
        removeOnFail: this.config.jobRemoveOnFail,
      });

      await this.prisma.jobQueue.update({
        where: { id: record.id },
        data: { bullJobId: String(bullJob.id) },
      });

      return record;
    } catch (error) {
      await this.prisma.jobQueue.update({
        where: { id: record.id },
        data: { status: JobStatus.FAILED, error: (error as Error)?.message },
      });
      this.logger.error(
        `Failed to enqueue job '${jobName}' on queue '${queueName}'`,
        (error as Error)?.stack,
        'JobsService',
      );
      throw error;
    }
  }
}
