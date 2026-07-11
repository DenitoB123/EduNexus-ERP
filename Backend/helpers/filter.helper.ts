import { FilterCondition } from '../interfaces/base-model.interface';

export class FilterHelper {
  static buildWhere(
    filters?: FilterCondition[],
    allowedFields?: string[],
  ): Record<string, unknown> {
    if (!filters || filters.length === 0) return {};

    const where: Record<string, unknown> = {};

    for (const filter of filters) {
      if (allowedFields && !allowedFields.includes(filter.field)) continue;

      switch (filter.operator) {
        case 'eq':
          where[filter.field] = filter.value;
          break;
        case 'neq':
          where[filter.field] = { not: filter.value };
          break;
        case 'gt':
          where[filter.field] = { gt: filter.value };
          break;
        case 'gte':
          where[filter.field] = { gte: filter.value };
          break;
        case 'lt':
          where[filter.field] = { lt: filter.value };
          break;
        case 'lte':
          where[filter.field] = { lte: filter.value };
          break;
        case 'between': {
          const [min, max] = filter.value as [unknown, unknown];
          where[filter.field] = { gte: min, lte: max };
          break;
        }
        case 'contains':
          where[filter.field] = { contains: filter.value, mode: 'insensitive' };
          break;
        case 'startsWith':
          where[filter.field] = { startsWith: filter.value, mode: 'insensitive' };
          break;
        case 'endsWith':
          where[filter.field] = { endsWith: filter.value, mode: 'insensitive' };
          break;
        case 'in':
          where[filter.field] = { in: filter.value as unknown[] };
          break;
        case 'notIn':
          where[filter.field] = { notIn: filter.value as unknown[] };
          break;
        case 'isNull':
          where[filter.field] = null;
          break;
        case 'isNotNull':
          where[filter.field] = { not: null };
          break;
        default:
          break;
      }
    }

    return where;
  }
}
