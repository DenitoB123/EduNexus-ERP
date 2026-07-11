export type AggregationFunction = 'count' | 'sum' | 'avg' | 'min' | 'max';

export interface AggregationRequest {
  groupBy?: string[];
  aggregations: Array<{ field: string; fn: AggregationFunction }>;
  where?: Record<string, unknown>;
}

export interface BuiltAggregationQuery {
  where?: Record<string, unknown>;
  by?: string[];
  _count?: Record<string, boolean> | boolean;
  _sum?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _min?: Record<string, boolean>;
  _max?: Record<string, boolean>;
}

/**
 * Builds a Prisma-compatible aggregate()/groupBy() argument object
 * from a simple declarative request, so callers don't need to know
 * Prisma's `_sum`/`_avg`/`_count` shape directly.
 */
export class AggregationBuilder {
  static build(request: AggregationRequest): BuiltAggregationQuery {
    const query: BuiltAggregationQuery = {};

    if (request.where) query.where = request.where;
    if (request.groupBy?.length) query.by = request.groupBy;

    for (const { field, fn } of request.aggregations) {
      switch (fn) {
        case 'count':
          query._count = { ...(typeof query._count === 'object' ? query._count : {}), [field]: true };
          break;
        case 'sum':
          query._sum = { ...query._sum, [field]: true };
          break;
        case 'avg':
          query._avg = { ...query._avg, [field]: true };
          break;
        case 'min':
          query._min = { ...query._min, [field]: true };
          break;
        case 'max':
          query._max = { ...query._max, [field]: true };
          break;
        default:
          break;
      }
    }

    return query;
  }
}
