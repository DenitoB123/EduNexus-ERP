export interface IWriteRepository<T, CreateInput = Partial<T>, UpdateInput = Partial<T>> {
  create(data: CreateInput, tenantId: string, actorId?: string): Promise<T>;
  update(id: string, data: UpdateInput, tenantId: string, actorId?: string): Promise<T>;
  upsert(id: string, createData: CreateInput, updateData: UpdateInput, tenantId: string, actorId?: string): Promise<T>;
  batchCreate(items: CreateInput[], tenantId: string, actorId?: string): Promise<number>;
  batchUpdate(ids: string[], data: UpdateInput, tenantId: string, actorId?: string): Promise<number>;
  batchDelete(ids: string[], tenantId: string): Promise<number>;
}
