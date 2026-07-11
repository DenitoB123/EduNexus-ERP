import { BaseQuery } from './base.query';

export abstract class TenantQuery extends BaseQuery {
  protected constructor(
    public readonly tenantId: string,
    public readonly schoolGroupId?: string,
    public readonly schoolId?: string,
    public readonly campusId?: string,
  ) {
    super();
  }
}
