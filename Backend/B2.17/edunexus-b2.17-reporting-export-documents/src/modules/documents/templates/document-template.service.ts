import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../../common/logger/app-logger.service';
import { EventBus } from '../../../infrastructure/events/event-bus.service';
import { PaginatedResult } from '../../../database/interfaces/base-model.interface';
import { DocumentTemplateModel, DocumentTemplateRepository } from './document-template.repository';
import { CreateDocumentTemplateDto, UpdateDocumentTemplateDto } from '../dto/document-template.dto';
import { DocumentTemplateCreatedEvent, DocumentTemplateUpdatedEvent } from '../events/document-lifecycle.event';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { DocumentTemplateFormat } from '../constants/document-type.enum';

@Injectable()
export class DocumentTemplateService {
  constructor(
    private readonly repository: DocumentTemplateRepository,
    private readonly eventBus: EventBus,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(DocumentTemplateService.name);
  }

  async create(tenantId: string, actorId: string | undefined, dto: CreateDocumentTemplateDto): Promise<DocumentTemplateModel> {
    const template = await this.repository.create(
      {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        format: dto.format ?? DocumentTemplateFormat.HTML,
        subjectTemplate: dto.subjectTemplate ?? null,
        bodyTemplate: dto.bodyTemplate,
        requiredFields: dto.requiredFields ?? [],
        branding: dto.branding ?? null,
        isActive: true,
      } as Partial<DocumentTemplateModel>,
      tenantId,
      actorId,
    );

    await this.eventBus.emit(new DocumentTemplateCreatedEvent(template.id, actorId, tenantId));
    this.logger.log(`Created document template "${template.id}" (${dto.code})`);
    return template;
  }

  async update(id: string, tenantId: string, actorId: string | undefined, dto: UpdateDocumentTemplateDto): Promise<DocumentTemplateModel> {
    const updated = await this.repository.update(
      id,
      {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.subjectTemplate !== undefined && { subjectTemplate: dto.subjectTemplate }),
        ...(dto.bodyTemplate !== undefined && { bodyTemplate: dto.bodyTemplate }),
        ...(dto.requiredFields !== undefined && { requiredFields: dto.requiredFields }),
        ...(dto.branding !== undefined && { branding: dto.branding }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      } as Partial<DocumentTemplateModel>,
      tenantId,
      actorId,
    );

    await this.eventBus.emit(new DocumentTemplateUpdatedEvent(id, actorId, tenantId));
    return updated;
  }

  async findById(id: string, tenantId: string): Promise<DocumentTemplateModel> {
    const template = await this.repository.findById(id, tenantId);
    if (!template) throw new ResourceNotFoundException('DocumentTemplate', id);
    return template;
  }

  async getActiveByCode(code: string, tenantId: string): Promise<DocumentTemplateModel> {
    const template = await this.repository.findByCode(code, tenantId);
    if (!template || !template.isActive) {
      throw new ResourceNotFoundException('Active DocumentTemplate', code);
    }
    return template;
  }

  async list(tenantId: string, page = 1, pageSize = 20): Promise<PaginatedResult<DocumentTemplateModel>> {
    return this.repository.findMany({ filters: [], pagination: { page, pageSize } }, tenantId);
  }

  async remove(id: string, tenantId: string, actorId?: string): Promise<void> {
    await this.repository.softDelete(id, tenantId, actorId);
  }
}
