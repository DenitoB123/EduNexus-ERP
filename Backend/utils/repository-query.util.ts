import { QueryOptions } from '../../database/interfaces/base-model.interface';
import { EnterpriseQueryBuilder, RelationIncludeOptions, BuiltEnterpriseQuery } from '../query-builder/enterprise-query-builder';
import { AggregationBuilder, AggregationRequest, BuiltAggregationQuery } from '../query-builder/aggregation-builder';

/**
 * Convenience facade over EnterpriseQueryBuilder/AggregationBuilder
 * for repository implementations that need both query construction
 * and aggregation in the same call site.
 */
export class RepositoryQueryUtil {
  static buildQuery(
    options: QueryOptions,
    tenantId: string,
    allowedFields?: string[],
    relations?: RelationIncludeOptions,
  ): BuiltEnterpriseQuery {
    return EnterpriseQueryBuilder.build(options, tenantId, allowedFields, relations);
  }

  static buildAggregation(request: AggregationRequest): BuiltAggregationQuery {
    return AggregationBuilder.build(request);
  }
}
