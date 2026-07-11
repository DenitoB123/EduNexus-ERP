import { PaginatedResult } from '../../database/interfaces/base-model.interface';
import { IMapper } from './mapper.interface';

export class ResponseMapper {
  static paginated<TEntity, TResponse>(
    result: PaginatedResult<TEntity>,
    mapper: IMapper<TEntity, TResponse>,
  ): PaginatedResult<TResponse> {
    return {
      items: mapper.toResponseList(result.items),
      meta: result.meta,
    };
  }
}
