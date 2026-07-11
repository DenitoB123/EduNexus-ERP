import { Injectable } from '@nestjs/common';
// New dependency required by this module — see IMPLEMENTATION_SUMMARY_B2_12.md.
import ExcelJS from 'exceljs';
import { ExportFormat, EXPORT_CONTENT_TYPES, EXPORT_FILE_EXTENSIONS } from '../constants/export-format.enum';
import { ExportInput, ExportResult, IReportExporter } from '../interfaces/exporter.interface';

@Injectable()
export class ExcelExporter implements IReportExporter {
  readonly format = ExportFormat.EXCEL;

  async export(input: ExportInput): Promise<ExportResult> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = input.branding?.institutionName ?? 'EduNexus';
    workbook.created = input.generatedAt ?? new Date();

    const sheet = workbook.addWorksheet(input.title.substring(0, 31) || 'Report');

    sheet.columns = input.columns.map((c) => ({
      header: c.label,
      key: c.key,
      width: c.width ?? Math.max(12, c.label.length + 2),
    }));

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: this.hexToArgb(input.branding?.primaryColor) },
    };

    for (const row of input.rows) {
      sheet.addRow(row);
    }

    for (const column of input.columns) {
      if (column.type === 'currency') {
        const col = sheet.getColumn(column.key);
        col.numFmt = '#,##0.00';
      }
      if (column.type === 'date') {
        const col = sheet.getColumn(column.key);
        col.numFmt = 'yyyy-mm-dd';
      }
    }

    if (input.branding?.footerText) {
      const footerRowIndex = input.rows.length + 3;
      sheet.getCell(footerRowIndex, 1).value = input.branding.footerText;
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      buffer,
      contentType: EXPORT_CONTENT_TYPES[this.format],
      fileExtension: EXPORT_FILE_EXTENSIONS[this.format],
      sizeBytes: buffer.byteLength,
    };
  }

  private hexToArgb(hex?: string): string {
    if (!hex) return 'FFEFEFEF';
    const clean = hex.replace('#', '').toUpperCase();
    return `FF${clean.length === 6 ? clean : 'EFEFEF'}`;
  }
}
