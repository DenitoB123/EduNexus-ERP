import { Module } from '@nestjs/common';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { ReportGenerationRunner } from './report-generation-runner.service';
import { ReportExecutionRepository } from './reporting-execution.repository';

import { ReportEngineService } from './report-engine/report-engine.service';
import { ReportFactory } from './report-engine/report.factory';
import { DatasetRegistry } from './report-engine/dataset-registry.service';

import { ExportService } from './export/export.service';
import { PdfExporter } from './export/pdf.exporter';
import { ExcelExporter } from './export/excel.exporter';
import { CsvExporter } from './export/csv.exporter';
import { JsonExporter } from './export/json.exporter';
import { XmlExporter } from './export/xml.exporter';
import { REPORT_EXPORTERS } from './export/export-tokens';

import { TemplateService } from './templates/template.service';
import { TemplateBrandingEngine } from './templates/template-branding.engine';
import { ReportTemplateRepository } from './templates/report-template.repository';

import { ScheduledReportService } from './scheduler/scheduled-report.service';
import { ScheduledReportRepository } from './scheduler/scheduled-report.repository';
import { ReportGenerationJobHandler } from './scheduler/report-generation.job-handler';

/**
 * B2.12 — Enterprise Reporting & Export Infrastructure.
 *
 * Standalone parallel milestone (see IMPLEMENTATION_SUMMARY_B2_12.md).
 * Deliberately imports nothing: PrismaService, AppLoggerService,
 * EventBus, JobQueueService/JobRegistry, CronService, StorageModule's
 * services, and EmailQueueService are all provided by @Global modules
 * already bootstrapped in AppModule (B1.1–B2.2), so they're available
 * here purely through constructor injection.
 *
 * Feature modules that want to publish reports/datasets only need
 * `ReportFactory` and `DatasetRegistry` — export both if a future
 * module lives outside this module's own dependency graph, e.g. via
 * a shared `ReportingModule.forFeature()`-style re-export, added at
 * B2.21 once the first consuming module exists.
 */
@Module({
  controllers: [ReportingController],
  providers: [
    ReportingService,
    ReportGenerationRunner,
    ReportExecutionRepository,

    ReportEngineService,
    ReportFactory,
    DatasetRegistry,

    ExportService,
    PdfExporter,
    ExcelExporter,
    CsvExporter,
    JsonExporter,
    XmlExporter,
    {
      provide: REPORT_EXPORTERS,
      useFactory: (
        pdf: PdfExporter,
        excel: ExcelExporter,
        csv: CsvExporter,
        json: JsonExporter,
        xml: XmlExporter,
      ) => [pdf, excel, csv, json, xml],
      inject: [PdfExporter, ExcelExporter, CsvExporter, JsonExporter, XmlExporter],
    },

    TemplateService,
    TemplateBrandingEngine,
    ReportTemplateRepository,

    ScheduledReportService,
    ScheduledReportRepository,
    ReportGenerationJobHandler,
  ],
  exports: [ReportFactory, DatasetRegistry, ReportEngineService, ExportService],
})
export class ReportingModule {}
