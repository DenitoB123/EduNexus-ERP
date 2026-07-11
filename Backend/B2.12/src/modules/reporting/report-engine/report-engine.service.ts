import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../../common/logger/app-logger.service';
import { FilterCondition, SortInput } from '../../../database/interfaces/base-model.interface';
import { DatasetRegistry } from './dataset-registry.service';
import { ReportFactory } from './report.factory';
import { ReportQueryBuilder, TenantScope } from './report.builder';
import { AggregationSpec, DatasetResult } from '../interfaces/dataset-provider.interface';
import { ReportDefinition } from '../interfaces/report-definition.interface';

export interface RunReportOptions {
  reportKey: string;
  scope: TenantScope;
  parameters?: Record<string, unknown>;
  filters?: FilterCondition[];
  sort?: SortInput[];
  groupBy?: string[];
  aggregations?: AggregationSpec[];
  page?: number;
  pageSize?: number;
}

export interface ReportRunResult {
  definition: ReportDefinition;
  data: DatasetResult;
}

/**
 * The core report-generation engine. Resolves a ReportDefinition,
 * validates/defaults its parameters, builds a scoped
 * DatasetQueryContext, and delegates data fetching to the registered
 * IAnalyticsDatasetProvider. Deliberately has no knowledge of export
 * formats or persistence — those are ExportService's and
 * ReportingService's concerns respectively, keeping this class
 * single-purpose and easy to unit test with mocked providers.
 */
@Injectable()
export class ReportEngineService {
  constructor(
    private readonly reportFactory: ReportFactory,
    private readonly datasetRegistry: DatasetRegistry,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('ReportEngineService');
  }

  async run(options: RunReportOptions): Promise<ReportRunResult> {
    const definition = this.reportFactory.resolve(options.reportKey);
    const provider = this.datasetRegistry.get(definition.datasetKey);
    const resolvedParameters = this.reportFactory.resolveParameters(definition, options.parameters);

    const queryContext = ReportQueryBuilder.forDefinition(definition)
      .withTenantScope(options.scope)
      .withParameters(resolvedParameters)
      .withFilters(options.filters)
      .withSort(options.sort)
      .withGroupBy(options.groupBy)
      .withAggregations(options.aggregations)
      .withPagination(options.page, options.pageSize)
      .build();

    this.logger.debug(
      `Running report "${definition.key}" against dataset "${definition.datasetKey}" for tenant ${options.scope.tenantId}`,
    );

    const data = await provider.fetch(queryContext);

    return { definition, data };
  }

  listDefinitions(moduleKey?: string): ReportDefinition[] {
    return this.reportFactory.list(moduleKey);
  }

  listDatasets() {
    return this.datasetRegistry.list().map((p) => ({
      key: p.key,
      description: p.description,
      columns: p.getColumns(),
    }));
  }
}
