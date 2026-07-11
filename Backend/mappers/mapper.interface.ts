export interface IMapper<TEntity, TResponse> {
  toResponse(entity: TEntity): TResponse;
  toResponseList(entities: TEntity[]): TResponse[];
}
