import { PaginationHelper } from './pagination.helper';

describe('PaginationHelper', () => {
  it('normalizes defaults when no input given', () => {
    const result = PaginationHelper.normalize();
    expect(result).toEqual({ skip: 0, take: 20, page: 1, pageSize: 20 });
  });

  it('clamps pageSize to MAX_PAGE_SIZE', () => {
    const result = PaginationHelper.normalize({ page: 1, pageSize: 500 });
    expect(result.pageSize).toBe(100);
  });

  it('clamps page to minimum of 1', () => {
    const result = PaginationHelper.normalize({ page: -5, pageSize: 10 });
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('computes skip correctly for page 3', () => {
    const result = PaginationHelper.normalize({ page: 3, pageSize: 10 });
    expect(result.skip).toBe(20);
  });

  it('builds pagination meta correctly', () => {
    const meta = PaginationHelper.buildMeta(45, 2, 20);
    expect(meta).toEqual({
      page: 2,
      pageSize: 20,
      totalItems: 45,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });
});
