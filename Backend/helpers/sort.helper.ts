import { DATABASE_CONSTANTS } from '../constants/database.constants';
import { SortInput } from '../interfaces/base-model.interface';

export class SortHelper {
  static buildOrderBy(
    sort?: SortInput[],
    allowedFields?: string[],
  ): Record<string, 'asc' | 'desc'>[] {
    if (!sort || sort.length === 0) {
      return [{ [DATABASE_CONSTANTS.DEFAULT_SORT_FIELD]: DATABASE_CONSTANTS.DEFAULT_SORT_ORDER }];
    }

    return sort
      .filter((s) => !allowedFields || allowedFields.includes(s.field))
      .map((s) => ({ [s.field]: s.order }));
  }
}
