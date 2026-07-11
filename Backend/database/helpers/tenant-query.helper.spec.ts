import { TenantQueryHelper } from './tenant-query.helper';

describe('TenantQueryHelper', () => {
  it('scopes where clause by tenantId, overriding any caller-supplied value', () => {
    const where = TenantQueryHelper.scopeWhere({ tenantId: 'other-tenant', name: 'x' }, 'real-tenant');
    expect(where.tenantId).toBe('real-tenant');
    expect(where.name).toBe('x');
  });

  it('excludes soft-deleted rows by default', () => {
    const where = TenantQueryHelper.excludeSoftDeleted({ name: 'x' });
    expect(where).toEqual({ name: 'x', deletedAt: null });
  });

  it('includes soft-deleted rows when explicitly requested', () => {
    const where = TenantQueryHelper.excludeSoftDeleted({ name: 'x' }, true);
    expect(where).toEqual({ name: 'x' });
  });

  it('scopes by school and campus only when provided', () => {
    expect(TenantQueryHelper.scopeBySchool({ a: 1 }, 'school-1')).toEqual({ a: 1, schoolId: 'school-1' });
    expect(TenantQueryHelper.scopeBySchool({ a: 1 })).toEqual({ a: 1 });
    expect(TenantQueryHelper.scopeByCampus({ a: 1 }, 'campus-1')).toEqual({ a: 1, campusId: 'campus-1' });
  });
});
