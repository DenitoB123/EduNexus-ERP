import { Injectable } from '@nestjs/common';
import { ExportFormat, EXPORT_CONTENT_TYPES, EXPORT_FILE_EXTENSIONS } from '../constants/export-format.enum';
import { ExportInput, ExportResult, IReportExporter } from '../interfaces/exporter.interface';

/**
 * Simplest exporter — also the reference implementation to copy when
 * adding a new format. Every exporter only needs to implement
 * IReportExporter; ExportService and ReportEngineService never change.
 */
@Injectable()
export class JsonExporter implements IReportExporter {
  readonly format = ExportFormat.JSON;

  async export(input: ExportInput): Promise<ExportResult> {
    const payload = {
      title: input.title,
      generatedAt: (input.generatedAt ?? new Date()).toISOString(),
      columns: input.columns,
      rowCount: input.rows.length,
      rows: input.rows,
      meta: input.meta,
    };
    const buffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');
    return {
      buffer,
      contentType: EXPORT_CONTENT_TYPES[this.format],
      fileExtension: EXPORT_FILE_EXTENSIONS[this.format],
      sizeBytes: buffer.byteLength,
    };
  }
}
