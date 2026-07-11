import { TenantQuery } from './tenant.query';

export interface ReportAggregation {
  field: string;
  fn: 'count' | 'sum' | 'avg' | 'min' | 'max';
}

/**
 * For analytical/reporting queries. Shaped to feed directly into
 * B2.2's `AggregationBuilder` (`common/query-builder/aggregation-builder.ts`):
 * `{ groupBy, aggregations }` on this query maps 1:1 onto
 * `AggregationBuilder.build()`'s input, so a ReportQuery handler is
 * typically a thin translation into that existing builder plus a
 * repository call — no new aggregation engine is introduced here.
 */
export abstract class ReportQuery extends TenantQuery {
  protected constructor(
    tenantId: string,
    public readonly dateFrom?: Date,
    public readonly dateTo?: Date,
    public readonly groupBy?: string[],
    public readonly aggregations?: ReportAggregation[],
    schoolGroupId?: string,
    schoolId?: string,
    campusId?: string,
  ) {
    super(tenantId, schoolGroupId, schoolId, campusId);
  }
}
