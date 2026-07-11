import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from '../../common/base/base.repository';
import { BaseModel } from '../../database/interfaces/base-model.interface';
import { ExportFormat } from './constants/export-format.enum';
import { ReportExecutionStatus, ReportTriggerType } from './constants/report-status.enum';

export interface ReportExecutionModel extends BaseModel {
  reportKey: string;
  templateId?: string | null;
  scheduledReportId?: string | null;
  format: ExportFormat;
  status: ReportExecutionStatus;
  triggerType: ReportTriggerType;
  parameters: Record<string, unknown>;
  progress: number;
  fileKey?: string | null;
  fileSizeBytes?: number | null;
  rowCount?: number | null;
  errorMessage?: string | null;
  requestedBy?: string | null;
  attempts: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

@Injectable()
export class ReportExecutionRepository extends BaseRepository<ReportExecutionModel> {
  protected readonly modelName = 'ReportExecution';
  protected readonly allowedFilterFields = ['reportKey', 'status', 'scheduledReportId', 'templateId'];

  constructor(private readonly prisma: PrismaService) {
    // Cast: the `reportExecution` delegate only exists once
    // prisma-fragment/reporting.models.prisma is merged at B2.21.
    super(
      (prisma as unknown as { reportExecution: BaseRepository<ReportExecutionModel>['delegate'] }).reportExecution,
    );
  }
}
