import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { UploadService } from '../../infrastructure/storage/upload.service';
import { EventBus } from '../../infrastructure/events/event-bus.service';
import { ReportEngineService } from './report-engine/report-engine.service';
import { ExportService } from './export/export.service';
import { TemplateService } from './templates/template.service';
import { ReportExecutionModel, ReportExecutionRepository } from './reporting-execution.repository';
import { StoredGenerationRequest } from './interfaces/generation-job.interface';
import { ReportExecutionStatus } from './constants/report-status.enum';
import { EXPORT_CONTENT_TYPES, EXPORT_FILE_EXTENSIONS } from './constants/export-format.enum';
import { REPORTING_STORAGE_PREFIX } from './constants/reporting.constants';
import { ReportGenerationCompletedEvent } from './events/report-generation-completed.event';
import { ReportGenerationFailedEvent } from './events/report-generation-failed.event';

/**
 * Single place that turns a QUEUED ReportExecution into a COMPLETED
 * (or FAILED) one: resolves the report + dataset, runs the query,
 * exports the buffer, uploads it, and updates the execution record.
 * Used identically by the synchronous controller path and by
 * ReportGenerationJobHandler (async/queued path) and
 * ScheduledReportService (cron-triggered path) — so all three
 * generation entry points share one auditable, retry-safe code path.
 */
@Injectable()
export class ReportGenerationRunner {
  constructor(
    private readonly reportEngine: ReportEngineService,
    private readonly exportService: ExportService,
    private readonly templateService: TemplateService,
    private readonly executionRepository: ReportExecutionRepository,
    private readonly uploadService: UploadService,
    private readonly eventBus: EventBus,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('ReportGenerationRunner');
  }

  async run(execution: ReportExecutionModel, request: StoredGenerationRequest): Promise<ReportExecutionModel> {
    try {
      await this.executionRepository.update(
        execution.id,
        { status: ReportExecutionStatus.PROCESSING, startedAt: new Date(), attempts: execution.attempts + 1 },
        execution.tenantId,
      );

      const template = execution.templateId
        ? await this.templateService.findById(execution.templateId, execution.tenantId)
        : null;

      const { definition, data } = await this.reportEngine.run({
        reportKey: request.reportKey,
        scope: {
          tenantId: execution.tenantId,
          schoolGroupId: request.schoolGroupId,
          schoolId: request.schoolId,
          campusId: request.campusId,
        },
        parameters: request.requestParameters,
        filters: request.filters,
        sort: request.sort,
        groupBy: request.groupBy,
        aggregations: request.aggregations,
        page: request.page,
        pageSize: request.pageSize,
      });

      const branding = this.templateService.resolveBranding(template);

      const exportResult = await this.exportService.export(execution.format, {
        title: definition.name,
        columns: data.columns ?? definition.columns,
        rows: data.rows,
        branding,
        generatedAt: new Date(),
        meta: { executionId: execution.id, reportKey: definition.key },
      });

      const fileKey = `${REPORTING_STORAGE_PREFIX}/${execution.tenantId}/${execution.id}.${EXPORT_FILE_EXTENSIONS[execution.format]}`;

      await this.uploadService.upload({
        key: fileKey,
        buffer: exportResult.buffer,
        contentType: EXPORT_CONTENT_TYPES[execution.format],
        metadata: { executionId: execution.id, reportKey: definition.key },
      });

      const completed = await this.executionRepository.update(
        execution.id,
        {
          status: ReportExecutionStatus.COMPLETED,
          fileKey,
          fileSizeBytes: exportResult.sizeBytes,
          rowCount: data.rows.length,
          completedAt: new Date(),
          progress: 100,
        },
        execution.tenantId,
      );

      await this.eventBus.emit(
        new ReportGenerationCompletedEvent(execution.id, definition.key, fileKey, data.rows.length, execution.tenantId),
      );

      this.logger.log(`Completed report execution "${execution.id}" (${data.rows.length} rows, ${execution.format})`);

      return completed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during report generation';

      await this.executionRepository.update(
        execution.id,
        { status: ReportExecutionStatus.FAILED, errorMessage: message },
        execution.tenantId,
      );

      await this.eventBus.emit(
        new ReportGenerationFailedEvent(execution.id, request.reportKey, message, execution.attempts + 1, execution.tenantId),
      );

      this.logger.error(`Report execution "${execution.id}" failed: ${message}`, error instanceof Error ? error.stack : undefined);

      throw error;
    }
  }
}
