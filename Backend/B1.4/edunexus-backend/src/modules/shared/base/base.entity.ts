export abstract class BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  constructor(partial?: Partial<BaseEntity>) {
    if (partial) Object.assign(this, partial);
  }

  get isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }
}

export abstract class TenantBaseEntity extends BaseEntity {
  schoolId: string;

  constructor(partial?: Partial<TenantBaseEntity>) {
    super(partial);
    if (partial) Object.assign(this, partial);
  }
}
