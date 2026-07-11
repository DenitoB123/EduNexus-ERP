import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentGenerationRepository } from './document-generation.repository';

import { DocumentTemplateService } from './templates/document-template.service';
import { DocumentTemplateRepository } from './templates/document-template.repository';

import { DocumentPdfRenderer } from './rendering/document-pdf.renderer';

import { LetterGenerator } from './generators/letter.generator';
import { CertificateGenerator } from './generators/certificate.generator';
import { TranscriptGenerator } from './generators/transcript.generator';
import { ReceiptGenerator } from './generators/receipt.generator';
import { InvoiceGenerator } from './generators/invoice.generator';
import { ReportCardGenerator } from './generators/report-card.generator';
import { AdmissionLetterGenerator } from './generators/admission-letter.generator';
import { EmploymentLetterGenerator } from './generators/employment-letter.generator';
import { DocumentGeneratorRegistry } from './generators/document-generator.registry';

import { DocumentGenerationJobHandler } from './scheduler/document-generation.job-handler';

import { TemplateEngineService } from '../../common/templates/template-engine.service';

import { DOCUMENT_GENERATORS } from './interfaces/document-generator.interface';

/**
 * B2.17 — Enterprise Reporting, Export & Document Generation
 * Framework (Document Generation half; the Reporting/Export half is
 * B2.12's already-existing `ReportingModule`, extended in place —
 * see IMPLEMENTATION_SUMMARY_B2_17.md).
 *
 * Same @Global-dependency assumption as ReportingModule: PrismaService,
 * AppLoggerService, EventBus, JobQueueService/JobRegistry, and
 * StorageModule's UploadService/SignedUrlService all come from
 * already-bootstrapped @Global modules, so nothing needs importing
 * here beyond this module's own providers.
 */
@Module({
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentGenerationRepository,

    DocumentTemplateService,
    DocumentTemplateRepository,

    TemplateEngineService,
    DocumentPdfRenderer,

    LetterGenerator,
    CertificateGenerator,
    TranscriptGenerator,
    ReceiptGenerator,
    InvoiceGenerator,
    ReportCardGenerator,
    AdmissionLetterGenerator,
    EmploymentLetterGenerator,
    {
      provide: DOCUMENT_GENERATORS,
      useFactory: (
        letter: LetterGenerator,
        certificate: CertificateGenerator,
        transcript: TranscriptGenerator,
        receipt: ReceiptGenerator,
        invoice: InvoiceGenerator,
        reportCard: ReportCardGenerator,
        admissionLetter: AdmissionLetterGenerator,
        employmentLetter: EmploymentLetterGenerator,
      ) => [letter, certificate, transcript, receipt, invoice, reportCard, admissionLetter, employmentLetter],
      inject: [
        LetterGenerator,
        CertificateGenerator,
        TranscriptGenerator,
        ReceiptGenerator,
        InvoiceGenerator,
        ReportCardGenerator,
        AdmissionLetterGenerator,
        EmploymentLetterGenerator,
      ],
    },
    DocumentGeneratorRegistry,

    DocumentGenerationJobHandler,
  ],
  exports: [DocumentsService, DocumentGeneratorRegistry, TemplateEngineService],
})
export class DocumentsModule {}
