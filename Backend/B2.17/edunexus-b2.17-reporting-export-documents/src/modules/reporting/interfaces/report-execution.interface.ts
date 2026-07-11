import { ExportFormat } from '../constants/export-format.enum';
import { ReportExecutionStatus, ReportTriggerType } from '../constants/report-status.enum';

/**
 * Shape of the `ReportExecution` Prisma model this module expects to
 * exist after the prisma-fragment/reporting.models.prisma is merged
 * into the shared schema at B2.21. Kept as a hand-written interface
 * so the module type-checks standalone before that merge happens.
 */
export interface ReportExecutionRecord {
  id: string;
  tenantId: string;
  schoolId?: string | null;
  campusId?: string | null;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReportExecutionInput {
  tenantId: string;
  schoolId?: string;
  campusId?: string;
  reportKey: string;
  templateId?: string;
  scheduledReportId?: string;
  format: ExportFormat;
  triggerType: ReportTriggerType;
  parameters: Record<string, unknown>;
  requestedBy?: string;
}
