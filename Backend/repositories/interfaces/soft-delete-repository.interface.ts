import { IAuditableRepository } from './auditable-repository.interface';

export interface ISoftDeleteRepository<T, CreateInput = Partial<T>, UpdateInput = Partial<T>>
  extends IAuditableRepository<T, CreateInput, UpdateInput> {
  softDelete(id: string, tenantId: string, actorId?: string): Promise<T>;
  restore(id: string, tenantId: string, actorId?: string): Promise<T>;
  permanentDelete(id: string, tenantId: string): Promise<void>;
}
