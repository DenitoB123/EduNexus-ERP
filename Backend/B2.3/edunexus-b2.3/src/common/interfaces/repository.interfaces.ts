/**
 * repository.interfaces.ts
 *
 * B2.3 — Generic Service Layer
 *
 * Contract describing the minimum repository surface that the Generic
 * Service Layer requires. This is NOT a reimplementation of the repository
 * layer built in B2.2 — it is the shape that milestone's repositories are
 * expected to satisfy. When merged, B2.2's concrete BaseRepository<T> should
 * already implement (or be adapted to implement) this interface, and the
 * DI token BASE_REPOSITORY should resolve to it per entity/module.
 */

export interface IFindManyOptions<T> {
  where?: Partial<T> | Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[];
  skip?: number;
  take?: number;
  include?: Record<string, unknown>;
  select?: Record<string, unknown>;
  /** Free-text search term; interpretation (which fields) is repository-specific. */
  search?: string;
  /** Include soft-deleted rows. Default: false. */
  withDeleted?: boolean;
}

export interface IPaginationOptions {
  page: number;
  pageSize: number;
}

export interface IPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Minimum repository contract required by BaseService and its descendants.
 * TEntity is the persisted model shape; TId is the primary key type.
 */
export interface IBaseRepository<TEntity, TId = string> {
  create(data: Partial<TEntity>, tenantId?: string): Promise<TEntity>;
  createMany(data: Partial<TEntity>[], tenantId?: string): Promise<TEntity[]>;

  update(id: TId, data: Partial<TEntity>, tenantId?: string): Promise<TEntity>;
  updateMany(
    where: Record<string, unknown>,
    data: Partial<TEntity>,
    tenantId?: string,
  ): Promise<{ count: number }>;

  upsert(
    where: Record<string, unknown>,
    createData: Partial<TEntity>,
    updateData: Partial<TEntity>,
    tenantId?: string,
  ): Promise<TEntity>;

  delete(id: TId, tenantId?: string): Promise<TEntity>;
  deleteMany(where: Record<string, unknown>, tenantId?: string): Promise<{ count: number }>;

  softDelete(id: TId, deletedBy?: string, tenantId?: string): Promise<TEntity>;
  restore(id: TId, restoredBy?: string, tenantId?: string): Promise<TEntity>;

  findById(id: TId, tenantId?: string, options?: IFindManyOptions<TEntity>): Promise<TEntity | null>;
  findOne(options: IFindManyOptions<TEntity>, tenantId?: string): Promise<TEntity | null>;
  findMany(options: IFindManyOptions<TEntity>, tenantId?: string): Promise<TEntity[]>;
  findManyPaginated(
    options: IFindManyOptions<TEntity>,
    pagination: IPaginationOptions,
    tenantId?: string,
  ): Promise<IPaginatedResult<TEntity>>;

  exists(where: Record<string, unknown>, tenantId?: string): Promise<boolean>;
  count(where?: Record<string, unknown>, tenantId?: string): Promise<number>;
}
