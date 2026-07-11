import { CursorPaginationHelper } from './cursor-pagination.helper';

describe('CursorPaginationHelper', () => {
  it('encodes and decodes a cursor round-trip', () => {
    const cursor = CursorPaginationHelper.encodeCursor('abc-123');
    expect(CursorPaginationHelper.decodeCursor(cursor)).toBe('abc-123');
  });

  it('normalizes take and decodes provided cursor', () => {
    const cursor = CursorPaginationHelper.encodeCursor('item-1');
    const result = CursorPaginationHelper.normalize({ cursor, take: 5 });
    expect(result).toEqual({ take: 5, cursorId: 'item-1' });
  });

  it('builds result with hasNextPage true when extra item fetched', () => {
    const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const result = CursorPaginationHelper.buildResult(items, 2);
    expect(result.items).toHaveLength(2);
    expect(result.meta.hasNextPage).toBe(true);
    expect(result.meta.nextCursor).toBe(CursorPaginationHelper.encodeCursor('2'));
  });

  it('builds result with hasNextPage false when no extra item', () => {
    const items = [{ id: '1' }, { id: '2' }];
    const result = CursorPaginationHelper.buildResult(items, 2);
    expect(result.meta.hasNextPage).toBe(false);
    expect(result.meta.nextCursor).toBeNull();
  });
});
