export interface DomainEntityMeta {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface TenantEntityMeta extends DomainEntityMeta {
  schoolId: string;
}

export abstract class DomainEntity implements DomainEntityMeta {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export abstract class TenantDomainEntity
  extends DomainEntity
  implements TenantEntityMeta
{
  schoolId: string;
}
