import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseRepository } from '../../../common/base/base.repository';
import { BaseModel } from '../../../database/interfaces/base-model.interface';
import { BrandingConfig } from '../../reporting/interfaces/branding.interface';
import { DocumentType, DocumentTemplateFormat } from '../constants/document-type.enum';

export interface DocumentTemplateModel extends BaseModel {
  code: string;
  name: string;
  type: DocumentType;
  format: DocumentTemplateFormat;
  subjectTemplate: string | null;
  bodyTemplate: string;
  requiredFields: string[];
  branding: BrandingConfig | null;
  isActive: boolean;
}

/**
 * Same pattern as B2.12's `ReportTemplateRepository` — see that
 * file's comment for why the constructor casts through
 * `unknown`: `documentTemplate` only exists on the Prisma client once
 * `prisma-fragment/documents.models.prisma` is merged into
 * schema.prisma at consolidation.
 */
@Injectable()
export class DocumentTemplateRepository extends BaseRepository<DocumentTemplateModel> {
  protected readonly modelName = 'DocumentTemplate';
  protected readonly allowedFilterFields = ['code', 'type', 'isActive'];

  constructor(private readonly prisma: PrismaService) {
    super((prisma as unknown as { documentTemplate: BaseRepository<DocumentTemplateModel>['delegate'] }).documentTemplate);
  }

  async findByCode(code: string, tenantId: string): Promise<DocumentTemplateModel | null> {
    return this.findOne({ filters: [{ field: 'code', operator: 'eq', value: code }] }, tenantId);
  }
}
