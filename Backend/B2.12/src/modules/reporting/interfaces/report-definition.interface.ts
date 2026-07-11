import { SortInput } from '../../../database/interfaces/base-model.interface';

export type ReportColumnType = 'string' | 'number' | 'date' | 'boolean' | 'currency';

export interface ReportColumn {
  key: string;
  label: string;
  type?: ReportColumnType;
  /** Optional format hint consumed by exporters, e.g. a date-fns/Intl format string. */
  format?: string;
  aggregatable?: boolean;
  groupable?: boolean;
  width?: number;
}

export type ReportParameterType = 'string' | 'number' | 'date' | 'boolean' | 'array';

export interface ReportParameter {
  name: string;
  type: ReportParameterType;
  required?: boolean;
  default?: unknown;
  label?: string;
  description?: string;
}

/**
 * Declarative description of a report that a feature module publishes
 * to the reporting infrastructure. Feature modules never talk to the
 * exporters or the queue directly — they register a ReportDefinition
 * (via ReportFactory.register) plus an IAnalyticsDatasetProvider (via
 * DatasetRegistry.register) and the reporting module does the rest.
 */
export interface ReportDefinition {
  /** Unique, stable key, e.g. "attendance.daily-summary". */
  key: string;
  name: string;
  description?: string;
  /** Owning module, for grouping/audit/display purposes, e.g. "attendance". */
  moduleKey: string;
  columns: ReportColumn[];
  parameters?: ReportParameter[];
  /** Key of the IAnalyticsDatasetProvider this report reads from. */
  datasetKey: string;
  defaultSort?: SortInput[];
  defaultGroupBy?: string[];
  supportsAggregation?: boolean;
  supportedFormats?: string[];
}
