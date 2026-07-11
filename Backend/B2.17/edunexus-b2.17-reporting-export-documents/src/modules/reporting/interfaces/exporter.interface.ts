import { Readable } from 'stream';
import { ExportFormat } from '../constants/export-format.enum';
import { ReportColumn } from './report-definition.interface';
import { BrandingConfig } from './branding.interface';

export interface ExportInput {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  branding?: BrandingConfig;
  generatedAt?: Date;
  meta?: Record<string, unknown>;
}

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  fileExtension: string;
  sizeBytes: number;
}

/**
 * Every exporter (pdf/excel/csv/json, and any future format) implements
 * this single interface. ExportService discovers exporters by their
 * `format` via DI (multi-provider token), so adding a new format never
 * requires touching ExportService.
 */
export interface IReportExporter {
  readonly format: ExportFormat;
  export(input: ExportInput): Promise<ExportResult>;
  /**
   * Optional streaming path for very large datasets. Exporters that
   * don't override this fall back to the buffered `export()` result
   * wrapped in a Readable by ExportService.
   */
  exportStream?(input: ExportInput): Promise<Readable>;
}
