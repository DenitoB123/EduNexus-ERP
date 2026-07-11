import { DATABASE_CONSTANTS } from '../constants/database.constants';
import { PaginatedResult, PaginationInput, PaginationMeta } from '../interfaces/base-model.interface';

export class PaginationHelper {
  static normalize(input?: PaginationInput): { skip: number; take: number; page: number; pageSize: number } {
    const page = Math.max(1, input?.page ?? 1);
    const pageSize = Math.min(
      Math.max(DATABASE_CONSTANTS.MIN_PAGE_SIZE, input?.pageSize ?? DATABASE_CONSTANTS.DEFAULT_PAGE_SIZE),
      DATABASE_CONSTANTS.MAX_PAGE_SIZE,
    );
    return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
  }

  static buildMeta(totalItems: number, page: number, pageSize: number): PaginationMeta {
    const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 0;
    return {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  static buildResult<T>(items: T[], totalItems: number, page: number, pageSize: number): PaginatedResult<T> {
    return { items, meta: this.buildMeta(totalItems, page, pageSize) };
  }
}
