/**
 * pdf-metadata.preparer.ts
 *
 * NOT a PDF renderer -- prepares plain, serializable metadata + row data
 * for whatever PDF-generation layer a future module wires up (e.g. a
 * report-cards or invoices module). Keeping this converter's output
 * format-agnostic (title/columns/rows/generatedAt) rather than binding
 * to a specific PDF library avoids this shared framework taking on a
 * heavy, business-module-specific rendering dependency.
 */

import { Injectable } from '@nestjs/common';

export interface IPdfExportMetadata<T> {
  title: string;
  generatedAt: string;
  columns: string[];
  rows: T[];
  rowCount: number;
}

@Injectable()
export class PdfMetadataPreparer {
  prepare<T extends Record<string, unknown>>(title: string, rows: T[], columns?: (keyof T & string)[]): IPdfExportMetadata<T> {
    const resolvedColumns = columns ?? (rows.length > 0 ? (Object.keys(rows[0]) as (keyof T & string)[]) : []);
    return {
      title,
      generatedAt: new Date().toISOString(),
      columns: resolvedColumns,
      rows,
      rowCount: rows.length,
    };
  }
}
