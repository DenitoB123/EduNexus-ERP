import { Buffer } from 'buffer';
import { CursorPaginatedResult, CursorPaginationInput } from '../interfaces/base-model.interface';
import { DATABASE_CONSTANTS } from '../constants/database.constants';

interface CursorRecord {
  id: string;
}

export class CursorPaginationHelper {
  static encodeCursor(id: string): string {
    return Buffer.from(id, 'utf-8').toString('base64');
  }

  static decodeCursor(cursor: string): string {
    return Buffer.from(cursor, 'base64').toString('utf-8');
  }

  static normalize(input?: CursorPaginationInput): { take: number; cursorId?: string } {
    const take = Math.min(
      Math.max(1, input?.take ?? DATABASE_CONSTANTS.DEFAULT_PAGE_SIZE),
      DATABASE_CONSTANTS.MAX_PAGE_SIZE,
    );
    return {
      take,
      cursorId: input?.cursor ? this.decodeCursor(input.cursor) : undefined,
    };
  }

  static buildResult<T extends CursorRecord>(items: T[], take: number): CursorPaginatedResult<T> {
    const hasNextPage = items.length > take;
    const pageItems = hasNextPage ? items.slice(0, take) : items;
    const lastItem = pageItems[pageItems.length - 1];

    return {
      items: pageItems,
      meta: {
        nextCursor: hasNextPage && lastItem ? this.encodeCursor(lastItem.id) : null,
        hasNextPage,
      },
    };
  }
}
