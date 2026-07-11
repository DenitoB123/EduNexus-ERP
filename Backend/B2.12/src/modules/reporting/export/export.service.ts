import { Inject, Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { AppLoggerService } from '../../../common/logger/app-logger.service';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { ExportFormat } from '../constants/export-format.enum';
import { ExportInput, ExportResult, IReportExporter } from '../interfaces/exporter.interface';
import { REPORT_EXPORTERS } from './export-tokens';

/**
 * Thin dispatcher over the registered IReportExporter providers.
 * Deliberately has zero format-specific logic — every format lives in
 * its own exporter class, which is what keeps this "extensible" per
 * B2.12's requirement: adding a format means adding an exporter +
 * registering it in reporting.module.ts, nothing here changes.
 */
@Injectable()
export class ExportService {
  private readonly exportersByFormat: Map<ExportFormat, IReportExporter>;

  constructor(
    @Inject(REPORT_EXPORTERS) exporters: IReportExporter[],
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('ExportService');
    this.exportersByFormat = new Map(exporters.map((e) => [e.format, e]));
  }

  private resolve(format: ExportFormat): IReportExporter {
    const exporter = this.exportersByFormat.get(format);
    if (!exporter) {
      throw new ValidationException(`Unsupported export format "${format}"`);
    }
    return exporter;
  }

  async export(format: ExportFormat, input: ExportInput): Promise<ExportResult> {
    this.logger.debug(`Exporting "${input.title}" as ${format} (${input.rows.length} rows)`);
    return this.resolve(format).export(input);
  }

  /**
   * Streaming path for large reports. Falls back to buffering through
   * the exporter's normal export() (wrapped in a Readable) if the
   * exporter doesn't implement a native stream.
   */
  async exportStream(format: ExportFormat, input: ExportInput): Promise<Readable> {
    const exporter = this.resolve(format);
    if (exporter.exportStream) {
      return exporter.exportStream(input);
    }
    const result = await exporter.export(input);
    return Readable.from(result.buffer);
  }

  supportedFormats(): ExportFormat[] {
    return Array.from(this.exportersByFormat.keys());
  }
}
