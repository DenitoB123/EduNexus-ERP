import { EnterpriseQueryBuilder } from './enterprise-query-builder';
import { AggregationBuilder } from './aggregation-builder';

describe('EnterpriseQueryBuilder', () => {
  it('builds a plain query with no includes when none requested', () => {
    const query = EnterpriseQueryBuilder.build({}, 't1');
    expect(query.include).toBeUndefined();
    expect(query.where).toMatchObject({ tenantId: 't1' });
  });

  it('builds flat includes for requested relations', () => {
    const query = EnterpriseQueryBuilder.build({}, 't1', undefined, { include: ['campus', 'guardians'] });
    expect(query.include).toEqual({ campus: true, guardians: true });
  });

  it('builds nested includes when specified', () => {
    const query = EnterpriseQueryBuilder.build({}, 't1', undefined, {
      include: ['campus'],
      nestedInclude: { campus: ['school'] },
    });
    expect(query.include).toEqual({ campus: { include: { school: true } } });
  });
});

describe('AggregationBuilder', () => {
  it('builds a groupBy with sum and count aggregations', () => {
    const query = AggregationBuilder.build({
      groupBy: ['campusId'],
      aggregations: [
        { field: 'id', fn: 'count' },
        { field: 'amount', fn: 'sum' },
      ],
    });

    expect(query).toEqual({
      by: ['campusId'],
      _count: { id: true },
      _sum: { amount: true },
    });
  });

  it('includes a where clause when provided', () => {
    const query = AggregationBuilder.build({
      aggregations: [{ field: 'amount', fn: 'avg' }],
      where: { status: 'active' },
    });

    expect(query.where).toEqual({ status: 'active' });
    expect(query._avg).toEqual({ amount: true });
  });
});
