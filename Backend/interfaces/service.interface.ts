export interface IService<TEntity, TCreateInput = Partial<TEntity>, TUpdateInput = Partial<TEntity>> {
  findById(id: string): Promise<TEntity | null>;
  create(input: TCreateInput): Promise<TEntity>;
  update(id: string, input: TUpdateInput): Promise<TEntity>;
  remove(id: string): Promise<void>;
}
