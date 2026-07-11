import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { EventBus } from '../../infrastructure/events/event-bus.service';
import { JobQueueService } from '../../infrastructure/jobs/job-queue.service';
import { SignedUrlService } from '../../infrastructure/storage/signed-url.service';
import { PaginatedResult } from '../../database/interfaces/base-model.interface';
import { ValidationException } from '../../common/exceptions/validation.exception';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception';
import { ReportEngineService } from './report-engine/report-engine.service';
import { ReportGenerationRunner } from './report-generation-runner.service';
import { ReportExecutionModel, ReportExecutionRepository } from './reporting-execution.repository';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportExecutionQueryDto } from './dto/report-query.dto';
import { ReportExecutionStatus, ReportTriggerType } from './constants/report-status.enum';
import { REPORTING_DOWNLOAD_URL_TTL_SECONDS, REPORTING_JOB_NAMES, REPORTING_SYNC_ROW_LIMIT } from './constants/reporting.constants';
import { StoredGenerationRequest } from './interfaces/generation-job.interface';
import { ReportGenerationRequestedEvent } from './events/report-generation-requested.event';
import { ReportDownloadedEvent } from './events/report-downloaded.event';
import { TenantScope } from './report-engine/report.builder';

export interface GenerateReportResult {
  execution: ReportExecutionModel;
  downloadUrl?: string;
}

@Injectable()
export class ReportingService {
  constructor(
    private readonly reportEngine: ReportEngineService,
    private readonly runner: ReportGenerationRunner,
    private readonly executionRepository: ReportExecutionRepository,
    private readonly jobQueueService: JobQueueService,
    private readonly signedUrlService: SignedUrlService,
    private readonly eventBus: EventBus,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('ReportingService');
  }

  /**
   * Entry point used by the controller. Always creates an audited
   * ReportExecution row first. If `dto.async` is set (or the request
   * plainly asks for a large/paginated export), generation is queued
   * through the existing job infrastructure; otherwise it runs inline
   * and the caller gets a completed execution + signed download URL
   * in the same response.
   */
  async generateReport(scope: TenantScope, actorId: string | undefined, reportKey: string, dto: GenerateReportDto): Promise<GenerateReportResult> {
    const storedRequest: StoredGenerationRequest = {
      reportKey,
      requestParameters: dto.parameters ?? {},
      filters: dto.filters,
      sort: dto.sort,
      groupBy: dto.groupBy,
      aggregations: dto.aggregations,
      page: dto.page,
      pageSize: dto.pageSize,
      schoolGroupId: scope.schoolGroupId,
      schoolId: scope.schoolId,
      campusId: scope.campusId,
    };

    const execution = await this.executionRepository.create(
      {
        reportKey,
        templateId: dto.templateId ?? null,
        scheduledReportId: null,
        format: dto.format,
        status: ReportExecutionStatus.QUEUED,
        triggerType: ReportTriggerType.MANUAL,
        parameters: storedRequest as unknown as Record<string, unknown>,
        progress: 0,
        attempts: 0,
        requestedBy: actorId ?? null,
      },
      scope.tenantId,
      actorId,
    );

    await this.eventBus.emit(
      new ReportGenerationRequestedEvent(execution.id, reportKey, dto.format, ReportTriggerType.MANUAL, scope.tenantId),
    );

    if (dto.async) {
      await this.jobQueueService.enqueue(REPORTING_JOB_NAMES.GENERATE_REPORT, {
        executionId: execution.id,
        tenantId: scope.tenantId,
      });
      this.logger.log(`Queued asynchronous report execution "${execution.id}" for report "${reportKey}"`);
      return { execution };
    }

    const completed = await this.runner.run(execution, storedRequest);

    if (completed.rowCount && completed.rowCount > REPORTING_SYNC_ROW_LIMIT) {
      this.logger.warn(
        `Report execution "${execution.id}" returned ${completed.rowCount} rows synchronously; consider async=true for reports this size`,
      );
    }

    const downloadUrl = completed.fileKey
      ? await this.signedUrlService.getSignedUrl(completed.fileKey, {
          expiresInSeconds: REPORTING_DOWNLOAD_URL_TTL_SECONDS,
          operation: 'get',
        })
      : undefined;

    return { execution: completed, downloadUrl };
  }

  async getExecution(id: string, tenantId: string): Promise<ReportExecutionModel> {
    const execution = await this.executionRepository.findById(id, tenantId);
    if (!execution) {
      throw new ResourceNotFoundException('ReportExecution', id);
    }
    return execution;
  }

  async listExecutions(tenantId: string, query: ReportExecutionQueryDto): Promise<PaginatedResult<ReportExecutionModel>> {
    return this.executionRepository.findMany(
      {
        pagination: { page: query.page, pageSize: query.pageSize },
        filters: [
          ...(query.reportKey ? [{ field: 'reportKey', operator: 'eq' as const, value: query.reportKey }] : []),
          ...(query.status ? [{ field: 'status', operator: 'eq' as const, value: query.status }] : []),
        ],
      },
      tenantId,
    );
  }

  /** Produces a short-lived signed URL for a completed execution's file, auditing the download. */
  async getDownloadUrl(id: string, tenantId: string, actorId?: string): Promise<string> {
    const execution = await this.getExecution(id, tenantId);

    if (execution.status !== ReportExecutionStatus.COMPLETED || !execution.fileKey) {
      throw new ValidationException(`Report execution "${id}" is not yet completed (status: ${execution.status})`);
    }

    const url = await this.signedUrlService.getSignedUrl(execution.fileKey, {
      expiresInSeconds: REPORTING_DOWNLOAD_URL_TTL_SECONDS,
      operation: 'get',
    });

    await this.eventBus.emit(new ReportDownloadedEvent(id, actorId, tenantId));

    return url;
  }

  listDatasets() {
    return this.reportEngine.listDatasets();
  }

  listReportDefinitions(moduleKey?: string) {
    return this.reportEngine.listDefinitions(moduleKey);
  }
}
