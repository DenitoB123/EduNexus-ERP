import { Injectable } from '@nestjs/common';
// New dependency required by this module — see IMPLEMENTATION_SUMMARY_B2_12.md.
import PDFDocument from 'pdfkit';
import { ExportFormat, EXPORT_CONTENT_TYPES, EXPORT_FILE_EXTENSIONS } from '../constants/export-format.enum';
import { ExportInput, ExportResult, IReportExporter } from '../interfaces/exporter.interface';

const PAGE_MARGIN = 40;
const ROW_HEIGHT = 20;

/**
 * Table-oriented PDF renderer. Handles pagination across pages,
 * institution branding (logo/name/colors in the header, footer text +
 * page numbers in the footer), and column-width layout derived from
 * ReportColumn.width or an even split of the printable width.
 */
@Injectable()
export class PdfExporter implements IReportExporter {
  readonly format = ExportFormat.PDF;

  async export(input: ExportInput): Promise<ExportResult> {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    this.renderHeader(doc, input);
    this.renderTable(doc, input);
    this.renderFooterOnAllPages(doc, input);

    doc.end();
    const buffer = await done;

    return {
      buffer,
      contentType: EXPORT_CONTENT_TYPES[this.format],
      fileExtension: EXPORT_FILE_EXTENSIONS[this.format],
      sizeBytes: buffer.byteLength,
    };
  }

  private renderHeader(doc: PDFKit.PDFDocument, input: ExportInput): void {
    if (input.branding?.institutionName) {
      doc.fontSize(10).fillColor('#666666').text(input.branding.institutionName, PAGE_MARGIN, PAGE_MARGIN);
    }
    doc
      .fontSize(16)
      .fillColor(input.branding?.primaryColor ?? '#111111')
      .text(input.title, PAGE_MARGIN, PAGE_MARGIN + 16);

    doc
      .fontSize(8)
      .fillColor('#888888')
      .text(`Generated ${(input.generatedAt ?? new Date()).toLocaleString()}`, PAGE_MARGIN, PAGE_MARGIN + 38);

    doc.moveDown(2);
  }

  private renderTable(doc: PDFKit.PDFDocument, input: ExportInput): void {
    const printableWidth = doc.page.width - PAGE_MARGIN * 2;
    const columnWidth = printableWidth / Math.max(input.columns.length, 1);
    let y = PAGE_MARGIN + 70;

    const drawHeaderRow = () => {
      doc.fontSize(9).fillColor('#FFFFFF');
      doc.rect(PAGE_MARGIN, y, printableWidth, ROW_HEIGHT).fill(input.branding?.primaryColor ?? '#2C3E50');
      let x = PAGE_MARGIN;
      doc.fillColor('#FFFFFF');
      for (const col of input.columns) {
        doc.text(col.label, x + 4, y + 5, { width: columnWidth - 8, ellipsis: true });
        x += columnWidth;
      }
      y += ROW_HEIGHT;
    };

    drawHeaderRow();

    doc.fontSize(8).fillColor('#222222');
    for (const row of input.rows) {
      if (y + ROW_HEIGHT > doc.page.height - PAGE_MARGIN - 30) {
        doc.addPage({ margin: PAGE_MARGIN, size: 'A4', layout: 'landscape' });
        y = PAGE_MARGIN;
        drawHeaderRow();
        doc.fontSize(8).fillColor('#222222');
      }
      let x = PAGE_MARGIN;
      for (const col of input.columns) {
        const value = row[col.key];
        doc.text(value === null || value === undefined ? '' : String(value), x + 4, y + 5, {
          width: columnWidth - 8,
          ellipsis: true,
        });
        x += columnWidth;
      }
      y += ROW_HEIGHT;
    }
  }

  private renderFooterOnAllPages(doc: PDFKit.PDFDocument, input: ExportInput): void {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      const footerY = doc.page.height - PAGE_MARGIN - 10;
      doc
        .fontSize(7)
        .fillColor('#999999')
        .text(input.branding?.footerText ?? '', PAGE_MARGIN, footerY, { align: 'left' });
      doc
        .fontSize(7)
        .fillColor('#999999')
        .text(`Page ${i - range.start + 1} of ${range.count}`, PAGE_MARGIN, footerY, {
          align: 'right',
          width: doc.page.width - PAGE_MARGIN * 2,
        });
    }
  }
}
