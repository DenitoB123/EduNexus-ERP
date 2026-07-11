import { SearchEngine } from './search.engine';
import { SortingEngine } from '../sorting/sorting.engine';
import { FilterEngine } from './filter.engine';

describe('SearchEngine', () => {
  it('converts a DTO with query and fields into a SearchInput', () => {
    const input = SearchEngine.toSearchInput({ q: 'alice', fields: 'name,email' });
    expect(input).toEqual({ query: 'alice', fields: ['name', 'email'] });
  });

  it('returns undefined when no query is present', () => {
    expect(SearchEngine.toSearchInput({})).toBeUndefined();
  });

  it('uses default fields when none specified in the DTO', () => {
    const input = SearchEngine.toSearchInput({ q: 'alice' }, ['name']);
    expect(input?.fields).toEqual(['name']);
  });
});

describe('SortingEngine', () => {
  it('parses a comma-separated sort string with directions', () => {
    const result = SortingEngine.parse('createdAt:desc,name:asc');
    expect(result).toEqual([
      { field: 'createdAt', order: 'desc' },
      { field: 'name', order: 'asc' },
    ]);
  });

  it('defaults to ascending order when no direction given', () => {
    const result = SortingEngine.parse('name');
    expect(result[0].order).toBe('asc');
  });

  it('returns empty array for undefined input', () => {
    expect(SortingEngine.parse(undefined)).toEqual([]);
  });

  it('respects allowedFields filtering', () => {
    const result = SortingEngine.parse('name:asc,secret:desc', ['name']);
    expect(result).toEqual([{ field: 'name', order: 'asc' }]);
  });
});

describe('FilterEngine', () => {
  it('parses nested filter[field][operator]=value structure', () => {
    const conditions = FilterEngine.parse({ status: { eq: 'active' }, age: { gte: '18' } });
    expect(conditions).toContainEqual({ field: 'status', operator: 'eq', value: 'active' });
    expect(conditions).toContainEqual({ field: 'age', operator: 'gte', value: '18' });
  });

  it('returns empty array for undefined input', () => {
    expect(FilterEngine.parse(undefined)).toEqual([]);
  });

  it('buildWhere delegates to FilterHelper correctly', () => {
    const where = FilterEngine.buildWhere([{ field: 'status', operator: 'eq', value: 'active' }]);
    expect(where).toEqual({ status: 'active' });
  });
});
