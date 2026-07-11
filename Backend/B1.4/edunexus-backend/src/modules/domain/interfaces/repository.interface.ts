export interface FindManyResult<T> {
  items: T[];
  total: number;
}

export interface FindManyParams {
  skip?: number;
  take?: number;
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
}

export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findOne(where: Record<string, unknown>): Promise<T | null>;
  findMany(params: FindManyParams): Promise<FindManyResult<T>>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  softDelete(id: string): Promise<T>;
  count(where?: Record<string, unknown>): Promise<number>;
}

export interface ITenantRepository<T> extends IRepository<T> {
  findByIdAndTenant(id: string, schoolId: string): Promise<T | null>;
  findManyByTenant(
    schoolId: string,
    params: FindManyParams,
  ): Promise<FindManyResult<T>>;
}
