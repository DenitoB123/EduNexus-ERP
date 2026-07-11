import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLoggerService } from '../../../common/logger/app-logger.service';
import { EventBus } from '../../../infrastructure/events/event-bus.service';
import { IEventHandler } from '../../../infrastructure/interfaces/event.interface';
import { CronService } from '../../../infrastructure/scheduler/cron.service';
import { JobQueueService } from '../../../infrastructure/jobs/job-queue.service';
import { EmailQueueService } from '../../../infrastructure/email/email-queue.service';
import { DownloadService } from '../../../infrastructure/storage/download.service';
import { PaginatedResult } from '../../../database/interfaces/base-model.interface';
import { ScheduledReportModel, ScheduledReportRepository } from './scheduled-report.repository';
import { ReportExecutionRepository } from '../reporting-execution.repository';
import { CreateScheduledReportDto } from '../dto/create-scheduled-report.dto';
import { UpdateScheduledReportDto } from '../dto/update-scheduled-report.dto';
import { ScheduleFrequencyMapper } from './schedule-frequency.mapper';
import { ReportExecutionStatus, ReportDeliveryChannel, ReportTriggerType } from '../constants/report-status.enum';
import {
  REPORTING_CRON_TASK_PREFIX,
  REPORTING_EVENT_NAMES,
  REPORTING_JOB_NAMES,
} from '../constants/reporting.constants';
import { StoredGenerationRequest } from '../interfaces/generation-job.interface';
import { ScheduledReportExecutedEvent } from '../events/scheduled-report-executed.event';
import { ReportGenerationCompletedEvent } from '../events/report-generation-completed.event';
import {
  ScheduledReportCreatedEvent,
  ScheduledReportRemovedEvent,
  ScheduledReportUpdatedEvent,
} from '../events/schedule-lifecycle.event';
import { EXPORT_FILE_EXTENSIONS } from '../constants/export-format.enum';
import { IReportScheduler } from '../../../common/interfaces/reporting-framework.interfaces';

/**
 * Owns the full lifecycle of ScheduledReport records: CRUD, and
 * translating each active record into a live cron registration via
 * the existing CronService. On boot, `onModuleInit` rehydrates every
 * active schedule across all tenants so cron registrations survive
 * process restarts/deploys.
 */
@Injectable()
export class ScheduledReportService
  implements OnModuleInit, IReportScheduler<ScheduledReportModel, CreateScheduledReportDto, UpdateScheduledReportDto>
{
  constructor(
    private readonly repository: ScheduledReportRepository,
    private readonly executionRepository: ReportExecutionRepository,
    private readonly cronService: CronService,
    private readonly jobQueueService: JobQueueService,
    private readonly emailQueueService: EmailQueueService,
    private readonly downloadService: DownloadService,
    private readonly eventBus: EventBus,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('ScheduledReportService');
  }

  async onModuleInit(): Promise<void> {
    const activeSchedules = await this.repository.findAllActiveAcrossTenants();
    for (const schedule of activeSchedules) {
      this.registerCron(schedule);
    }

    // Closes the delivery loop for scheduled reports: when any report
    // execution completes, check whether it originated from a
    // schedule with EMAIL delivery configured, and if so email the
    // generated file to its recipients. Manual (non-scheduled)
    // generations are unaffected since they have no scheduledReportId.
    this.eventBus.subscribe<ReportGenerationCompletedEvent>(
      REPORTING_EVENT_NAMES.GENERATION_COMPLETED,
      this.buildCompletionDeliveryHandler(),
    );

    this.logger.log(`Rehydrated ${activeSchedules.length} active scheduled report(s)`);
  }

  private buildCompletionDeliveryHandler(): IEventHandler<ReportGenerationCompletedEvent> {
    return {
      handle: async (event) => this.deliverOnCompletion(event),
    };
  }

  private async deliverOnCompletion(event: ReportGenerationCompletedEvent): Promise<void> {
    const execution = await this.executionRepository.findById(event.executionId, event.tenantId as string);
    if (!execution?.scheduledReportId) return;

    const schedule = await this.repository.findById(execution.scheduledReportId, execution.tenantId);
    if (!schedule || !schedule.deliveryChannels.includes(ReportDeliveryChannel.EMAIL) || !schedule.recipientEmails.length) {
      return;
    }

    const fileBuffer = await this.downloadService.download(event.fileKey);
    await this.emailQueueService.enqueue({
      to: schedule.recipientEmails,
      subject: `Scheduled report: ${schedule.name}`,
      html: `<p>Your scheduled report "${schedule.name}" is ready. It is attached to this email.</p>`,
      attachments: [
        {
          filename: `${schedule.name}.${EXPORT_FILE_EXTENSIONS[schedule.format]}`,
          content: fileBuffer,
        },
      ],
    });

    this.logger.log(`Delivered scheduled report "${schedule.id}" to ${schedule.recipientEmails.length} recipient(s) by email`);
  }

  private cronTaskName(scheduledReportId: string): string {
    return `${REPORTING_CRON_TASK_PREFIX}${scheduledReportId}`;
  }

  private registerCron(schedule: ScheduledReportModel): void {
    this.cronService.addCron(this.cronTaskName(schedule.id), schedule.cronExpression, () => {
      void this.execute(schedule.id, schedule.tenantId);
    });
  }

  private unregisterCron(scheduledReportId: string): void {
    this.cronService.removeCron(this.cronTaskName(scheduledReportId));
  }

  async create(
    tenantId: string,
    actorId: string | undefined,
    dto: CreateScheduledReportDto,
  ): Promise<ScheduledReportModel> {
    const cronExpression = ScheduleFrequencyMapper.toCronExpression(dto.frequency, dto.cronExpression);

    const schedule = await this.repository.create(
      {
        name: dto.name,
        reportKey: dto.reportKey,
        templateId: dto.templateId ?? null,
        format: dto.format,
        frequency: dto.frequency,
        cronExpression,
        parameters: dto.parameters ?? null,
        deliveryChannels: dto.deliveryChannels,
        recipientEmails: dto.recipientEmails ?? [],
        isActive: dto.isActive ?? true,
      },
      tenantId,
      actorId,
    );

    if (schedule.isActive) {
      this.registerCron(schedule);
    }

    await this.eventBus.emit(new ScheduledReportCreatedEvent(schedule.id, actorId, tenantId));
    this.logger.log(`Created scheduled report "${schedule.id}" (${dto.frequency}) for tenant ${tenantId}`);
    return schedule;
  }

  async update(
    id: string,
    tenantId: string,
    actorId: string | undefined,
    dto: UpdateScheduledReportDto,
  ): Promise<ScheduledReportModel> {
    const cronExpression =
      dto.frequency !== undefined ? ScheduleFrequencyMapper.toCronExpression(dto.frequency, dto.cronExpression) : undefined;

    const schedule = await this.repository.update(
      id,
      {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.format !== undefined && { format: dto.format }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency }),
        ...(cronExpression !== undefined && { cronExpression }),
        ...(dto.parameters !== undefined && { parameters: dto.parameters }),
        ...(dto.deliveryChannels !== undefined && { deliveryChannels: dto.deliveryChannels }),
        ...(dto.recipientEmails !== undefined && { recipientEmails: dto.recipientEmails }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      tenantId,
      actorId,
    );

    this.unregisterCron(id);
    if (schedule.isActive) {
      this.registerCron(schedule);
    }

    await this.eventBus.emit(new ScheduledReportUpdatedEvent(id, actorId, tenantId));
    return schedule;
  }

  async remove(id: string, tenantId: string, actorId?: string): Promise<void> {
    await this.repository.softDelete(id, tenantId, actorId);
    this.unregisterCron(id);
    await this.eventBus.emit(new ScheduledReportRemovedEvent(id, actorId, tenantId));
  }

  async findById(id: string, tenantId: string): Promise<ScheduledReportModel | null> {
    return this.repository.findById(id, tenantId);
  }

  async list(tenantId: string, page = 1, pageSize = 20): Promise<PaginatedResult<ScheduledReportModel>> {
    return this.repository.findMany({ pagination: { page, pageSize } }, tenantId);
  }

  /** Manually triggers a schedule immediately, outside its cron cadence (used by the "run now" endpoint). */
  async runNow(id: string, tenantId: string): Promise<string> {
    const schedule = await this.repository.findById(id, tenantId);
    if (!schedule) {
      throw new Error(`Scheduled report "${id}" not found`);
    }
    return this.execute(schedule.id, schedule.tenantId);
  }

  /**
   * Cron tick handler: creates a new ReportExecution row and enqueues
   * generation through the same JobQueueService/ReportGenerationJobHandler
   * path used for asynchronous manual generation, so scheduled runs get
   * identical progress tracking, retries, and auditing.
   */
  private async execute(scheduledReportId: string, tenantId: string): Promise<string> {
    const schedule = await this.repository.findById(scheduledReportId, tenantId);
    if (!schedule || !schedule.isActive) {
      this.logger.warn(`Skipping execution of inactive/missing scheduled report "${scheduledReportId}"`);
      return '';
    }

    const storedRequest: StoredGenerationRequest = {
      reportKey: schedule.reportKey,
      requestParameters: schedule.parameters ?? {},
    };

    const execution = await this.executionRepository.create(
      {
        reportKey: schedule.reportKey,
        templateId: schedule.templateId,
        scheduledReportId: schedule.id,
        format: schedule.format,
        status: ReportExecutionStatus.QUEUED,
        triggerType: ReportTriggerType.SCHEDULED,
        parameters: storedRequest as unknown as Record<string, unknown>,
        progress: 0,
        attempts: 0,
      },
      tenantId,
    );

    const jobId = await this.jobQueueService.enqueue(REPORTING_JOB_NAMES.GENERATE_REPORT, {
      executionId: execution.id,
      tenantId,
    });

    await this.repository.update(schedule.id, { lastRunAt: new Date() }, tenantId);

    await this.eventBus.emit(new ScheduledReportExecutedEvent(schedule.id, execution.id, tenantId));
    this.logger.log(`Enqueued job "${jobId}" for scheduled report "${schedule.id}" -> execution "${execution.id}"`);

    return execution.id;
  }
}
