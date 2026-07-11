export interface IDomainService<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  findById(id: string): Promise<T>;
  findAll(page: number, limit: number): Promise<{ items: T[]; total: number }>;
  create(dto: TCreate): Promise<T>;
  update(id: string, dto: TUpdate): Promise<T>;
  remove(id: string): Promise<void>;
}

export interface ITenantDomainService<
  T,
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
> extends IDomainService<T, TCreate, TUpdate> {
  findByIdForTenant(id: string, schoolId: string): Promise<T>;
  findAllForTenant(
    schoolId: string,
    page: number,
    limit: number,
  ): Promise<{ items: T[]; total: number }>;
}
