import { Injectable } from '@nestjs/common';
import { Builder } from 'xml2js';
import { ExportFormat, EXPORT_CONTENT_TYPES, EXPORT_FILE_EXTENSIONS } from '../constants/export-format.enum';
import { ExportInput, ExportResult, IReportExporter } from '../interfaces/exporter.interface';

/**
 * B2.17 addition to B2.12's export framework. Registered exactly the
 * way json.exporter.ts's own doc comment describes: "adding a new
 * format = one new class + one line in reporting.module.ts's
 * REPORT_EXPORTERS factory" — ExportService, ReportEngineService, and
 * every other exporter are unmodified.
 *
 * Uses `xml2js` (new dependency, see IMPLEMENTATION_SUMMARY_B2_17.md
 * §5) purely for well-formed escaping/serialization; the document
 * shape below is deliberately simple (`<report><row><colKey>value</colKey>...`)
 * since XML report consumers are almost always doing straight tabular
 * ingestion, not needing a schema-driven structure.
 */
@Injectable()
export class XmlExporter implements IReportExporter {
  readonly format = ExportFormat.XML;

  async export(input: ExportInput): Promise<ExportResult> {
    const builder = new Builder({ rootName: 'report', xmldec: { version: '1.0', encoding: 'UTF-8' } });

    const payload = {
      title: input.title,
      generatedAt: (input.generatedAt ?? new Date()).toISOString(),
      rowCount: input.rows.length,
      columns: {
        column: input.columns.map((col) => ({ $: { key: col.key, type: col.type ?? 'string' }, _: col.label })),
      },
      rows: {
        row: input.rows.map((row) => this.buildRow(input.columns.map((c) => c.key), row)),
      },
    };

    const xml = builder.buildObject(payload);
    const buffer = Buffer.from(xml, 'utf-8');

    return {
      buffer,
      contentType: EXPORT_CONTENT_TYPES[this.format],
      fileExtension: EXPORT_FILE_EXTENSIONS[this.format],
      sizeBytes: buffer.byteLength,
    };
  }

  private buildRow(columnKeys: string[], row: Record<string, unknown>): Record<string, unknown> {
    const entry: Record<string, unknown> = {};
    for (const key of columnKeys) {
      const value = row[key];
      entry[this.sanitizeTagName(key)] = value === null || value === undefined ? '' : String(value);
    }
    return entry;
  }

  /** XML element names can't start with a digit or contain most punctuation — column keys from dynamic datasets aren't guaranteed to be safe. */
  private sanitizeTagName(key: string): string {
    const cleaned = key.replace(/[^a-zA-Z0-9_]/g, '_');
    return /^[a-zA-Z_]/.test(cleaned) ? cleaned : `_${cleaned}`;
  }
}
