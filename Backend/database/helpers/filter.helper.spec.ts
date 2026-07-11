import { FilterHelper } from './filter.helper';

describe('FilterHelper', () => {
  it('returns empty object when no filters', () => {
    expect(FilterHelper.buildWhere()).toEqual({});
  });

  it('builds eq filter', () => {
    const where = FilterHelper.buildWhere([{ field: 'status', operator: 'eq', value: 'active' }]);
    expect(where).toEqual({ status: 'active' });
  });

  it('builds contains filter case-insensitively', () => {
    const where = FilterHelper.buildWhere([{ field: 'name', operator: 'contains', value: 'jo' }]);
    expect(where).toEqual({ name: { contains: 'jo', mode: 'insensitive' } });
  });

  it('excludes fields not in allowedFields', () => {
    const where = FilterHelper.buildWhere(
      [{ field: 'secret', operator: 'eq', value: 'x' }],
      ['name'],
    );
    expect(where).toEqual({});
  });

  it('builds isNull and isNotNull filters', () => {
    expect(FilterHelper.buildWhere([{ field: 'deletedAt', operator: 'isNull' }])).toEqual({
      deletedAt: null,
    });
    expect(FilterHelper.buildWhere([{ field: 'deletedAt', operator: 'isNotNull' }])).toEqual({
      deletedAt: { not: null },
    });
  });
});
