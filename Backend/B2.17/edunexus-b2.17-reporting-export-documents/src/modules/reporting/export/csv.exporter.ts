import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { ExportFormat, EXPORT_CONTENT_TYPES, EXPORT_FILE_EXTENSIONS } from '../constants/export-format.enum';
import { ExportInput, ExportResult, IReportExporter } from '../interfaces/exporter.interface';

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildRow(columns: { key: string }[], row: Record<string, unknown>): string {
  return columns.map((c) => csvEscape(row[c.key])).join(',') + '\r\n';
}

/**
 * Dependency-free CSV implementation (no need to pull in a library for
 * something this mechanically simple). Implements exportStream() so
 * very large reports can be piped straight to the HTTP response or to
 * StorageService without buffering the whole file in memory.
 */
@Injectable()
export class CsvExporter implements IReportExporter {
  readonly format = ExportFormat.CSV;

  async export(input: ExportInput): Promise<ExportResult> {
    const header = input.columns.map((c) => csvEscape(c.label)).join(',') + '\r\n';
    const body = input.rows.map((row) => buildRow(input.columns, row)).join('');
    const buffer = Buffer.from(header + body, 'utf-8');
    return {
      buffer,
      contentType: EXPORT_CONTENT_TYPES[this.format],
      fileExtension: EXPORT_FILE_EXTENSIONS[this.format],
      sizeBytes: buffer.byteLength,
    };
  }

  async exportStream(input: ExportInput): Promise<Readable> {
    const columns = input.columns;
    let index = 0;
    let headerWritten = false;

    return new Readable({
      read() {
        if (!headerWritten) {
          headerWritten = true;
          this.push(columns.map((c) => csvEscape(c.label)).join(',') + '\r\n');
          return;
        }
        if (index >= input.rows.length) {
          this.push(null);
          return;
        }
        this.push(buildRow(columns, input.rows[index]));
        index += 1;
      },
    });
  }
}
