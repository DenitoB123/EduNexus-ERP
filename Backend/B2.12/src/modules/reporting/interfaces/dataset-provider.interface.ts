import {
  FilterCondition,
  PaginationInput,
  SortInput,
} from '../../../database/interfaces/base-model.interface';
import { ReportColumn } from './report-definition.interface';

export type AggregationFn = 'sum' | 'avg' | 'min' | 'max' | 'count';

export interface AggregationSpec {
  field: string;
  fn: AggregationFn;
  alias?: string;
}

/**
 * Everything a dataset provider needs to produce rows for a report
 * run. Tenant isolation fields come from TenantContextService via
 * ReportEngineService — dataset providers must always scope their
 * underlying Prisma queries to `tenantId` (and `schoolId`/`campusId`
 * when present) exactly like any other repository in this codebase.
 */
export interface DatasetQueryContext {
  tenantId: string;
  schoolGroupId?: string;
  schoolId?: string;
  campusId?: string;
  parameters: Record<string, unknown>;
  filters: FilterCondition[];
  sort: SortInput[];
  groupBy?: string[];
  aggregations?: AggregationSpec[];
  pagination?: PaginationInput;
}

export interface DatasetResult {
  rows: Record<string, unknown>[];
  totalCount: number;
  columns?: ReportColumn[];
}

/**
 * Implemented by feature modules (e.g. attendance, billing, exams)
 * and registered with DatasetRegistry. This is the sole extension
 * point future modules need to plug into reporting — they never
 * import report-engine/export internals directly.
 */
export interface IAnalyticsDatasetProvider {
  readonly key: string;
  readonly description?: string;
  getColumns(): ReportColumn[];
  fetch(context: DatasetQueryContext): Promise<DatasetResult>;
}
