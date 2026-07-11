import { PaginatedResult, QueryOptions } from './base-model.interface';

export interface IRepository<T, CreateInput = Partial<T>, UpdateInput = Partial<T>> {
  findById(id: string, tenantId: string): Promise<T | null>;
  findOne(options: QueryOptions, tenantId: string): Promise<T | null>;
  findMany(options: QueryOptions, tenantId: string): Promise<PaginatedResult<T>>;
  create(data: CreateInput, tenantId: string, actorId?: string): Promise<T>;
  update(id: string, data: UpdateInput, tenantId: string, actorId?: string): Promise<T>;
  softDelete(id: string, tenantId: string, actorId?: string): Promise<T>;
  restore(id: string, tenantId: string, actorId?: string): Promise<T>;
  hardDelete(id: string, tenantId: string): Promise<void>;
  count(options: QueryOptions, tenantId: string): Promise<number>;
}
