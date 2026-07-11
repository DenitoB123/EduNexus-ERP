import { FilterCondition, SortInput } from '../../../database/interfaces/base-model.interface';
import { AggregationSpec } from './dataset-provider.interface';

/** Queued via JobQueueService under REPORTING_JOB_NAMES.GENERATE_REPORT. */
export interface GenerateReportJobPayload {
  executionId: string;
  tenantId: string;
}

/**
 * Everything needed to re-run a report generation, persisted on
 * ReportExecutionModel.parameters so the job handler (which may run
 * on a different process/pod than the one that enqueued it) has full
 * context without relying on in-memory state.
 */
export interface StoredGenerationRequest {
  reportKey: string;
  requestParameters: Record<string, unknown>;
  filters?: FilterCondition[];
  sort?: SortInput[];
  groupBy?: string[];
  aggregations?: AggregationSpec[];
  page?: number;
  pageSize?: number;
  schoolGroupId?: string;
  schoolId?: string;
  campusId?: string;
}
