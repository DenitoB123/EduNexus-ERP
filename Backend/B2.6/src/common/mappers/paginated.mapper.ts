/**
 * paginated.mapper.ts
 *
 * Generic wrapper over the existing `ResponseMapper.paginated` (B2.2),
 * adapted to accept an `IEntityMapper`/`BaseMapper` (toDto) instead of
 * requiring the older `IMapper` (toResponse) shape, so the same paginated
 * mapping utility works for both mapper families without duplicating the
 * page-wrapping logic itself.
 */

import { PaginatedResult } from '../../database/interfaces/base-model.interface';
import { IEntityMapper } from './mapping.interfaces';

export class PaginatedMapper {
  static map<TEntity, TDto>(page: PaginatedResult<TEntity>, mapper: IEntityMapper<TEntity, TDto>): PaginatedResult<TDto> {
    return {
      items: mapper.toDtoList(page.items),
      meta: page.meta,
    };
  }
}
