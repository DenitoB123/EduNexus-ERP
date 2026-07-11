import { FilterHelper } from '../../database/helpers/filter.helper';
import { FilterCondition, FilterOperator } from '../../database/interfaces/base-model.interface';

export class FilterEngine {
  /**
   * Parses the query-string `filter[field][operator]=value` pattern
   * used by the API convention into FilterCondition[] for QueryBuilder.
   */
  static parse(filterParam: Record<string, Record<string, string>> | undefined): FilterCondition[] {
    if (!filterParam || typeof filterParam !== 'object') return [];

    const conditions: FilterCondition[] = [];

    for (const [field, operators] of Object.entries(filterParam)) {
      if (typeof operators !== 'object') continue;

      for (const [operator, value] of Object.entries(operators)) {
        conditions.push({ field, operator: operator as FilterOperator, value });
      }
    }

    return conditions;
  }

  static buildWhere(conditions: FilterCondition[], allowedFields?: string[]): Record<string, unknown> {
    return FilterHelper.buildWhere(conditions, allowedFields);
  }
}
