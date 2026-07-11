import {
  FilterCondition,
  PaginationInput,
  SortInput,
} from '../../../database/interfaces/base-model.interface';
import { AggregationSpec, DatasetQueryContext } from '../interfaces/dataset-provider.interface';
import { ReportDefinition } from '../interfaces/report-definition.interface';
import { REPORTING_DEFAULT_PAGE_SIZE } from '../constants/reporting.constants';
import { IReportBuilder } from '../../../common/interfaces/reporting-framework.interfaces';

export interface TenantScope {
  tenantId: string;
  schoolGroupId?: string;
  schoolId?: string;
  campusId?: string;
}

/**
 * Builds a DatasetQueryContext from raw request inputs, applying the
 * report definition's defaults (sort/groupBy) whenever the caller did
 * not explicitly override them, and always enforcing tenant scope.
 * Kept as a small standalone builder (rather than inlined in
 * ReportEngineService) so it is trivially unit-testable in isolation.
 */
export class ReportQueryBuilder implements IReportBuilder<DatasetQueryContext> {
  private filters: FilterCondition[] = [];
  private sort: SortInput[] = [];
  private groupBy?: string[];
  private aggregations?: AggregationSpec[];
  private pagination?: PaginationInput;
  private parameters: Record<string, unknown> = {};
  private scope!: TenantScope;

  static forDefinition(definition: ReportDefinition): ReportQueryBuilder {
    const builder = new ReportQueryBuilder();
    builder.sort = definition.defaultSort ?? [];
    builder.groupBy = definition.defaultGroupBy;
    return builder;
  }

  withTenantScope(scope: TenantScope): this {
    this.scope = scope;
    return this;
  }

  withParameters(parameters: Record<string, unknown>): this {
    this.parameters = parameters;
    return this;
  }

  withFilters(filters?: FilterCondition[]): this {
    if (filters?.length) this.filters = filters;
    return this;
  }

  withSort(sort?: SortInput[]): this {
    if (sort?.length) this.sort = sort;
    return this;
  }

  withGroupBy(groupBy?: string[]): this {
    if (groupBy?.length) this.groupBy = groupBy;
    return this;
  }

  withAggregations(aggregations?: AggregationSpec[]): this {
    if (aggregations?.length) this.aggregations = aggregations;
    return this;
  }

  withPagination(page?: number, pageSize?: number): this {
    this.pagination = {
      page: page ?? 1,
      pageSize: pageSize ?? REPORTING_DEFAULT_PAGE_SIZE,
    };
    return this;
  }

  build(): DatasetQueryContext {
    if (!this.scope?.tenantId) {
      throw new Error('ReportQueryBuilder requires a tenant scope before build()');
    }
    return {
      tenantId: this.scope.tenantId,
      schoolGroupId: this.scope.schoolGroupId,
      schoolId: this.scope.schoolId,
      campusId: this.scope.campusId,
      parameters: this.parameters,
      filters: this.filters,
      sort: this.sort,
      groupBy: this.groupBy,
      aggregations: this.aggregations,
      pagination: this.pagination,
    };
  }
}
