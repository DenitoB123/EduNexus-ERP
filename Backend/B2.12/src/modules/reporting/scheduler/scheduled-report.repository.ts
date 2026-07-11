import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseRepository } from '../../../common/base/base.repository';
import { BaseModel } from '../../../database/interfaces/base-model.interface';
import { ExportFormat } from '../constants/export-format.enum';
import { ScheduleFrequency } from '../constants/schedule-frequency.enum';
import { ReportDeliveryChannel } from '../constants/report-status.enum';

/**
 * Shape of the additive `ScheduledReport` Prisma model — see
 * prisma-fragment/reporting.models.prisma.
 */
export interface ScheduledReportModel extends BaseModel {
  name: string;
  reportKey: string;
  templateId?: string | null;
  format: ExportFormat;
  frequency: ScheduleFrequency;
  cronExpression: string;
  parameters: Record<string, unknown> | null;
  deliveryChannels: ReportDeliveryChannel[];
  recipientEmails: string[];
  isActive: boolean;
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
}

@Injectable()
export class ScheduledReportRepository extends BaseRepository<ScheduledReportModel> {
  protected readonly modelName = 'ScheduledReport';
  protected readonly allowedFilterFields = ['name', 'reportKey', 'isActive', 'frequency'];

  constructor(private readonly prisma: PrismaService) {
    // Cast: the `scheduledReport` delegate only exists once
    // prisma-fragment/reporting.models.prisma is merged at B2.21.
    super(
      (prisma as unknown as { scheduledReport: BaseRepository<ScheduledReportModel>['delegate'] }).scheduledReport,
    );
  }

  async findActive(tenantId: string): Promise<ScheduledReportModel[]> {
    const result = await this.findMany({ filters: [{ field: 'isActive', operator: 'eq', value: true }] }, tenantId);
    return result.items;
  }

  /**
   * Cross-tenant listing used only by the scheduler at boot to
   * rehydrate cron registrations. This deliberately bypasses the
   * single-tenant scoping BaseRepository enforces everywhere else —
   * it is a system-level operation, not a request-scoped one, and
   * every downstream job execution re-applies tenant scoping via
   * `tenantId` stored on the record itself.
   */
  async findAllActiveAcrossTenants(): Promise<ScheduledReportModel[]> {
    return this.delegate.findMany({ where: { isActive: true, deletedAt: null } });
  }
}
