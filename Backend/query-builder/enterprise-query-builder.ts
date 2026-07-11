import { QueryBuilder, BuiltQuery } from '../../database/helpers/query-builder.helper';
import { QueryOptions } from '../../database/interfaces/base-model.interface';

export interface RelationIncludeOptions {
  /** Relation names to eager-load, e.g. ["campus", "guardians"] */
  include?: string[];
  /** Nested includes per relation, e.g. { campus: ["school"] } */
  nestedInclude?: Record<string, string[]>;
}

export interface BuiltEnterpriseQuery extends BuiltQuery {
  include?: Record<string, boolean | { include: Record<string, boolean> }>;
}

/**
 * Wraps the existing B1.2 QueryBuilder (filter+search+sort+pagination
 * +tenant scoping) and adds Prisma `include` construction — the one
 * capability B2.2 asks for that QueryBuilder didn't already have.
 * Does not reimplement anything QueryBuilder already does.
 */
export class EnterpriseQueryBuilder {
  static build(
    options: QueryOptions,
    tenantId: string,
    allowedFields?: string[],
    relations?: RelationIncludeOptions,
  ): BuiltEnterpriseQuery {
    const base = QueryBuilder.build(options, tenantId, allowedFields);

    if (!relations?.include || relations.include.length === 0) {
      return base;
    }

    const include: Record<string, boolean | { include: Record<string, boolean> }> = {};

    for (const relation of relations.include) {
      const nested = relations.nestedInclude?.[relation];
      include[relation] = nested
        ? { include: Object.fromEntries(nested.map((n) => [n, true])) }
        : true;
    }

    return { ...base, include };
  }
}
