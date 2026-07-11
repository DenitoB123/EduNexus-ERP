import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../../common/logger/app-logger.service';
import { EventBus } from '../../../infrastructure/events/event-bus.service';
import { PaginatedResult } from '../../../database/interfaces/base-model.interface';
import { ReportTemplateModel, ReportTemplateRepository } from './report-template.repository';
import { CreateReportTemplateDto } from '../dto/create-report-template.dto';
import { UpdateReportTemplateDto } from '../dto/update-report-template.dto';
import { TemplateBrandingEngine } from './template-branding.engine';
import { BrandingConfig } from '../interfaces/branding.interface';
import { ReportTemplateCreatedEvent, ReportTemplateUpdatedEvent } from '../events/template-lifecycle.event';

/**
 * CRUD + rendering support for saved report templates: dynamic
 * layouts, branding placeholders, and per-institution defaults that
 * GenerateReportDto.templateId references at generation time.
 */
@Injectable()
export class TemplateService {
  constructor(
    private readonly repository: ReportTemplateRepository,
    private readonly brandingEngine: TemplateBrandingEngine,
    private readonly eventBus: EventBus,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('TemplateService');
  }

  async create(tenantId: string, actorId: string | undefined, dto: CreateReportTemplateDto): Promise<ReportTemplateModel> {
    const template = await this.repository.create(
      {
        name: dto.name,
        description: dto.description ?? null,
        reportKey: dto.reportKey,
        layout: dto.layout ?? null,
        branding: dto.branding ?? null,
        defaultParameters: dto.defaultParameters ?? null,
      },
      tenantId,
      actorId,
    );
    await this.eventBus.emit(new ReportTemplateCreatedEvent(template.id, actorId, tenantId));
    this.logger.log(`Created report template "${template.id}" (${dto.name}) for tenant ${tenantId}`);
    return template;
  }

  async update(
    id: string,
    tenantId: string,
    actorId: string | undefined,
    dto: UpdateReportTemplateDto,
  ): Promise<ReportTemplateModel> {
    const template = await this.repository.update(
      id,
      {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.layout !== undefined && { layout: dto.layout }),
        ...(dto.branding !== undefined && { branding: dto.branding }),
        ...(dto.defaultParameters !== undefined && { defaultParameters: dto.defaultParameters }),
      },
      tenantId,
      actorId,
    );
    await this.eventBus.emit(new ReportTemplateUpdatedEvent(id, actorId, tenantId));
    return template;
  }

  async findById(id: string, tenantId: string): Promise<ReportTemplateModel | null> {
    return this.repository.findById(id, tenantId);
  }

  async list(tenantId: string, page = 1, pageSize = 20): Promise<PaginatedResult<ReportTemplateModel>> {
    return this.repository.findMany({ pagination: { page, pageSize } }, tenantId);
  }

  async remove(id: string, tenantId: string, actorId?: string): Promise<void> {
    await this.repository.softDelete(id, tenantId, actorId);
  }

  /** Resolves the effective branding for a report run: template branding, falling back to institution defaults. */
  resolveBranding(template: ReportTemplateModel | null, institutionDefault?: BrandingConfig): BrandingConfig | undefined {
    return template?.branding ?? institutionDefault;
  }

  renderFooter(footerTemplate: string | undefined, branding?: BrandingConfig): string | undefined {
    if (!footerTemplate) return branding?.footerText;
    return this.brandingEngine.render(footerTemplate, branding);
  }
}
