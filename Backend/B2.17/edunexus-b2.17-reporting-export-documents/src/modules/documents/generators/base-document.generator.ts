import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../../common/logger/app-logger.service';
import { EventBus } from '../../../infrastructure/events/event-bus.service';
import { ValidationException } from '../../../common/exceptions/validation.exception';
import { UploadService } from '../../../infrastructure/storage/upload.service';
import { SignedUrlService } from '../../../infrastructure/storage/signed-url.service';
import { TemplateEngineService } from '../../../common/templates/template-engine.service';
import { DocumentPdfRenderer } from '../rendering/document-pdf.renderer';
import { DocumentTemplateService } from '../templates/document-template.service';
import { DocumentGenerationRepository } from '../document-generation.repository';
import { FileNamingUtil } from '../../../common/utils/file-naming.util';
import {
  DOCUMENTS_STORAGE_PREFIX,
  DOCUMENT_SIGNED_URL_TTL_SECONDS,
} from '../constants/documents.constants';
import { DocumentGenerationStatus, DocumentTemplateFormat, DocumentType } from '../constants/document-type.enum';
import { DocumentGenerationCompletedEvent, DocumentGenerationFailedEvent } from '../events/document-lifecycle.event';
import { DocumentGenerationInput, GeneratedDocumentResult, IDocumentGenerator } from '../interfaces/document-generator.interface';

/**
 * Shared pipeline for every document type: validate required fields
 * -> render template (TemplateEngineService, HTML or Markdown) ->
 * lay out as PDF (DocumentPdfRenderer) -> upload (UploadService, the
 * same B2.2 storage layer B2.12's reports use) -> persist a
 * DocumentGeneration audit row -> emit a lifecycle event.
 *
 * The 8 concrete generators in this folder each add ~10 lines
 * (their `type` and `requiredFields`) rather than reimplementing
 * this pipeline 8 times — the "Document Generation Framework"
 * requirement is this shared pipeline, not 8 independent ones.
 */
@Injectable()
export abstract class BaseDocumentGenerator implements IDocumentGenerator {
  abstract readonly type: DocumentType;
  abstract readonly requiredFields: string[];

  constructor(
    protected readonly templateService: DocumentTemplateService,
    protected readonly templateEngine: TemplateEngineService,
    protected readonly pdfRenderer: DocumentPdfRenderer,
    protected readonly generationRepository: DocumentGenerationRepository,
    protected readonly uploadService: UploadService,
    protected readonly signedUrlService: SignedUrlService,
    protected readonly eventBus: EventBus,
    protected readonly logger: AppLoggerService,
  ) {}

  async generate(tenantId: string, actorId: string | undefined, input: DocumentGenerationInput): Promise<GeneratedDocumentResult> {
    this.validateRequiredFields(input.data);
    const template = await this.templateService.getActiveByCode(input.templateCode, tenantId);

    const generation = await this.generationRepository.create(
      {
        templateId: template.id,
        type: this.type,
        status: DocumentGenerationStatus.PROCESSING,
        data: input.data,
        fileKey: null,
        fileSizeBytes: null,
        errorMessage: null,
        requestedBy: actorId ?? null,
        correlationId: input.correlationId ?? null,
        completedAt: null,
      } as any,
      tenantId,
      actorId,
    );

    try {
      const html = this.renderTemplate(template, input.data);
      const branding = input.branding ?? template.branding ?? undefined;

      const pdf = await this.pdfRenderer.render({
        title: template.name,
        html,
        orientation: input.orientation,
        branding,
        watermarkText: input.watermarkText,
        footerText: branding?.footerText,
      });

      const fileName = FileNamingUtil.buildName(`${this.type.toLowerCase()}-${generation.id}`, 'pdf');
      const fileKey = FileNamingUtil.buildStorageKey(DOCUMENTS_STORAGE_PREFIX, tenantId, fileName);

      await this.uploadService.upload({
        key: fileKey,
        buffer: pdf.buffer,
        contentType: 'application/pdf',
        metadata: { generationId: generation.id, type: this.type },
      });

      await this.generationRepository.update(
        generation.id,
        {
          status: DocumentGenerationStatus.COMPLETED,
          fileKey,
          fileSizeBytes: pdf.sizeBytes,
          completedAt: new Date(),
        } as any,
        tenantId,
      );

      await this.eventBus.emit(new DocumentGenerationCompletedEvent(generation.id, this.type, tenantId, fileKey));
      this.logger.log(`Generated ${this.type} document "${generation.id}" (${pdf.sizeBytes} bytes)`);

      const downloadUrl = await this.signedUrlService.getSignedUrl(fileKey, {
        expiresInSeconds: DOCUMENT_SIGNED_URL_TTL_SECONDS,
        operation: 'get',
      });

      return { generationId: generation.id, fileKey, fileSizeBytes: pdf.sizeBytes, downloadUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during document generation';
      await this.generationRepository.update(
        generation.id,
        { status: DocumentGenerationStatus.FAILED, errorMessage: message } as any,
        tenantId,
      );
      await this.eventBus.emit(new DocumentGenerationFailedEvent(generation.id, this.type, tenantId, message));
      this.logger.error(`Document generation "${generation.id}" (${this.type}) failed: ${message}`);
      throw error;
    }
  }

  protected renderTemplate(
    template: { bodyTemplate: string; format: DocumentTemplateFormat },
    data: Record<string, unknown>,
  ): string {
    return this.templateEngine.render(template.bodyTemplate, data, {
      format: template.format === DocumentTemplateFormat.MARKDOWN ? 'markdown' : 'html',
    });
  }

  protected validateRequiredFields(data: Record<string, unknown>): void {
    const missing = this.requiredFields.filter((field) => data[field] === undefined || data[field] === null || data[field] === '');
    if (missing.length > 0) {
      throw new ValidationException(`Missing required field(s) for ${this.type}: ${missing.join(', ')}`);
    }
  }
}
