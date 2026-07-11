import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { BrandingConfig } from '../../reporting/interfaces/branding.interface';
import { DocumentBlock, parseHtmlToBlocks } from './html-block.parser';

const PAGE_MARGIN = 56;

export interface DocumentPdfInput {
  title: string;
  html: string;
  orientation?: 'portrait' | 'landscape';
  branding?: BrandingConfig;
  watermarkText?: string;
  footerText?: string;
  generatedAt?: Date;
}

export interface DocumentPdfResult {
  buffer: Buffer;
  sizeBytes: number;
}

/**
 * Free-form-document counterpart to B2.12's `export/pdf.exporter.ts`
 * (which is tabular-report-specific: `ExportInput { columns, rows }`).
 * Letters/certificates/transcripts don't have a column/row shape, so
 * this is a new, separate PDFKit consumer rather than a forced fit
 * into `IReportExporter` — but it deliberately mirrors the same
 * visual conventions (branding block placement, footer page numbers,
 * margin sizing) so a generated letter and a generated report look
 * like they came from the same institution's system.
 *
 * See html-block.parser.ts for the (documented, intentionally
 * scoped) HTML-subset assumption this renderer makes about its input.
 */
@Injectable()
export class DocumentPdfRenderer {
  async render(input: DocumentPdfInput): Promise<DocumentPdfResult> {
    const doc = new PDFDocument({
      margin: PAGE_MARGIN,
      size: 'A4',
      layout: input.orientation ?? 'portrait',
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    this.renderHeader(doc, input);
    for (const block of parseHtmlToBlocks(input.html)) {
      this.renderBlock(doc, block);
    }

    this.renderWatermarkAndFooterOnAllPages(doc, input);

    doc.end();
    const buffer = await done;
    return { buffer, sizeBytes: buffer.byteLength };
  }

  private renderHeader(doc: PDFKit.PDFDocument, input: DocumentPdfInput): void {
    if (input.branding?.institutionName) {
      doc.fontSize(10).fillColor('#666666').text(input.branding.institutionName, { align: 'center' });
      doc.moveDown(0.3);
    }
    doc
      .fontSize(18)
      .fillColor(input.branding?.primaryColor ?? '#111111')
      .text(input.title, { align: 'center' });
    doc.moveDown(0.2);
    doc
      .fontSize(8)
      .fillColor('#999999')
      .text((input.generatedAt ?? new Date()).toLocaleDateString(), { align: 'center' });
    doc.moveDown(1.5);
    doc.fillColor('#000000');
  }

  private renderBlock(doc: PDFKit.PDFDocument, block: DocumentBlock): void {
    switch (block.kind) {
      case 'heading': {
        const size = block.level === 1 ? 15 : block.level === 2 ? 13 : 11.5;
        doc.fontSize(size).font('Helvetica-Bold').text(block.text);
        doc.font('Helvetica').moveDown(0.5);
        break;
      }
      case 'paragraph':
        doc.fontSize(11).text(block.text, { align: 'justify' });
        doc.moveDown(0.6);
        break;
      case 'list':
        for (const item of block.items) {
          doc.fontSize(11).text(`•  ${item}`, { indent: 16 });
        }
        doc.moveDown(0.6);
        break;
      case 'table':
        this.renderTable(doc, block.rows);
        doc.moveDown(0.6);
        break;
      case 'rule':
        doc
          .moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.width - doc.page.margins.right, doc.y)
          .strokeColor('#cccccc')
          .stroke();
        doc.moveDown(0.6);
        break;
    }
  }

  private renderTable(doc: PDFKit.PDFDocument, rows: string[][]): void {
    if (rows.length === 0) return;
    const printableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = printableWidth / rows[0].length;

    for (const [rowIndex, row] of rows.entries()) {
      const y = doc.y;
      const isHeaderRow = rowIndex === 0;
      doc.fontSize(10).font(isHeaderRow ? 'Helvetica-Bold' : 'Helvetica');

      for (const [cellIndex, cell] of row.entries()) {
        doc.text(cell, doc.page.margins.left + cellIndex * colWidth, y, { width: colWidth, align: 'left' });
      }
      doc.moveDown(0.4);
    }
    doc.font('Helvetica');
  }

  private renderWatermarkAndFooterOnAllPages(doc: PDFKit.PDFDocument, input: DocumentPdfInput): void {
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);

      if (input.watermarkText) {
        doc.save();
        doc
          .rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] })
          .fontSize(60)
          .fillOpacity(0.08)
          .fillColor('#000000')
          .text(input.watermarkText, 0, doc.page.height / 2 - 30, { width: doc.page.width, align: 'center' });
        doc.restore();
      }

      const footerY = doc.page.height - doc.page.margins.bottom + 12;
      doc
        .fontSize(8)
        .fillColor('#999999')
        .text(input.footerText ?? '', doc.page.margins.left, footerY, {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 60,
          align: 'left',
        });
      doc.text(`Page ${i - range.start + 1} of ${range.count}`, doc.page.width - doc.page.margins.right - 100, footerY, {
        width: 100,
        align: 'right',
      });
    }
  }
}
