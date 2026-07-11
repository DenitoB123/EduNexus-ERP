/**
 * audit-export.service.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 *
 * NEW DEPENDENCY: `exceljs` for the Excel export path — not present in
 * this codebase's package.json today (checked: no xlsx/exceljs/json2csv
 * anywhere in dependencies). JSON and CSV export need no library. Add
 * `"exceljs": "^4.4.0"` to package.json's dependencies and run
 * `npm install` before using exportToExcel() — everything else in this
 * file works without it.
 *
 * PDF export is explicitly out of scope per this milestone's own brief
 * ("PDF generation belongs to Reporting").
 */

import { Injectable } from '@nestjs/common';
import { IAuditEvent } from '../interfaces/audit-event.interface';

const CSV_COLUMNS: (keyof IAuditEvent)[] = [
  'id',
  'occurredAt',
  'category',
  'action',
  'severity',
  'module',
  'entityType',
  'entityId',
  'actorId',
  'actorType',
  'correlationId',
  'ipAddress',
  'statusCode',
  'durationMs',
  'message',
];

@Injectable()
export class AuditExportService {
  exportToJson(events: IAuditEvent[]): string {
    return JSON.stringify(events, null, 2);
  }

  exportToCsv(events: IAuditEvent[]): string {
    const header = CSV_COLUMNS.join(',');
    const rows = events.map((event) =>
      CSV_COLUMNS.map((col) => this.csvEscape(this.formatValue(event[col]))).join(','),
    );
    return [header, ...rows].join('\n');
  }

  /**
   * Requires `exceljs` (see file header). Imported lazily inside the
   * method rather than at module top-level so the rest of this service —
   * and everything that depends on AuditModule — still loads, and still
   * *compiles*, without exceljs installed; only calling exportToExcel()
   * itself requires the dependency to actually be present. Typed as a
   * minimal local shape rather than `typeof import('exceljs')` for the
   * same reason: referencing exceljs's own types here would make this
   * file fail to compile before the dependency is even added.
   */
  async exportToExcel(events: IAuditEvent[]): Promise<Buffer> {
    interface MinimalExcelJsModule {
      Workbook: new () => {
        addWorksheet(name: string): {
          columns: { header: string; key: string; width: number }[];
          addRow(row: Record<string, string>): void;
          getRow(index: number): { font: { bold: boolean } };
        };
        xlsx: { writeBuffer(): Promise<ArrayBuffer> };
      };
    }

    let ExcelJS: MinimalExcelJsModule;
    try {
      ExcelJS = (await import('exceljs' as string)) as unknown as MinimalExcelJsModule;
    } catch {
      throw new Error(
        '"exceljs" is not installed. Add "exceljs" to package.json dependencies and run `npm install` to enable Excel export.',
      );
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Audit Events');
    sheet.columns = CSV_COLUMNS.map((col) => ({ header: String(col), key: String(col), width: 20 }));
    for (const event of events) {
      sheet.addRow(CSV_COLUMNS.reduce((row, col) => ({ ...row, [col]: this.formatValue(event[col]) }), {}));
    }
    sheet.getRow(1).font = { bold: true };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }

  private csvEscape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
