import { PaginationHelper } from '../../database/helpers/pagination.helper';
import { CursorPaginationHelper } from '../../database/helpers/cursor-pagination.helper';

export { PaginationHelper, CursorPaginationHelper };

export class PaginationUtils {
  static buildLinks(baseUrl: string, page: number, totalPages: number): Record<string, string | null> {
    return {
      self: `${baseUrl}?page=${page}`,
      first: `${baseUrl}?page=1`,
      last: totalPages > 0 ? `${baseUrl}?page=${totalPages}` : null,
      prev: page > 1 ? `${baseUrl}?page=${page - 1}` : null,
      next: page < totalPages ? `${baseUrl}?page=${page + 1}` : null,
    };
  }
}
