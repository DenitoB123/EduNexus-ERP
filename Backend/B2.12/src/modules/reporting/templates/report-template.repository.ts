import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseRepository } from '../../../common/base/base.repository';
import { BaseModel } from '../../../database/interfaces/base-model.interface';
import { BrandingConfig, ReportLayoutConfig } from '../interfaces/branding.interface';

/**
 * Shape of the additive `ReportTemplate` Prisma model — see
 * prisma-fragment/reporting.models.prisma. Extends BaseModel so it
 * plugs directly into BaseRepository (tenant scoping, soft delete,
 * optimistic locking, audit fields all come for free).
 */
export interface ReportTemplateModel extends BaseModel {
  name: string;
  description?: string | null;
  reportKey: string;
  layout: ReportLayoutConfig | null;
  branding: BrandingConfig | null;
  defaultParameters: Record<string, unknown> | null;
}

@Injectable()
export class ReportTemplateRepository extends BaseRepository<ReportTemplateModel> {
  protected readonly modelName = 'ReportTemplate';
  protected readonly allowedFilterFields = ['name', 'reportKey'];

  constructor(private readonly prisma: PrismaService) {
    // Cast: the `reportTemplate` delegate only exists once
    // prisma-fragment/reporting.models.prisma is merged into the
    // shared schema.prisma at B2.21. See IMPLEMENTATION_SUMMARY_B2_12.md.
    super((prisma as unknown as { reportTemplate: BaseRepository<ReportTemplateModel>['delegate'] }).reportTemplate);
  }
}
