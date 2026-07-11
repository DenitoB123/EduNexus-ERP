import { PaginatedResult, PaginationInput, QueryOptions } from '../../../database/interfaces/base-model.interface';

export interface IReadRepository<T> {
  findById(id: string, tenantId: string): Promise<T | null>;
  findOne(options: QueryOptions, tenantId: string): Promise<T | null>;
  findMany(options: QueryOptions, tenantId: string): Promise<PaginatedResult<T>>;
  exists(id: string, tenantId: string): Promise<boolean>;
  count(options: QueryOptions, tenantId: string): Promise<number>;
}

export type { PaginationInput };
