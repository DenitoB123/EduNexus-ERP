/**
 * collection.mapper.ts
 *
 * Batch/bulk/paginated/stream mapping (B2.6 "Batch Mapping" requirement),
 * built on top of an `IEntityMapper` so any BaseMapper subclass gets these
 * for free without re-implementing collection handling per module.
 */

import { PaginatedResult } from '../../database/interfaces/base-model.interface';
import { ICollectionMapper, IEntityMapper } from './mapping.interfaces';
import { PaginatedMapper } from './paginated.mapper';

const DEFAULT_CHUNK_SIZE = 500;

export class CollectionMapper<TEntity, TDto> implements ICollectionMapper<TEntity, TDto> {
  constructor(private readonly mapper: IEntityMapper<TEntity, TDto>) {}

  mapMany(entities: TEntity[]): TDto[] {
    return this.mapper.toDtoList(entities);
  }

  /** Maps in fixed-size chunks so very large in-memory arrays don't map (and allocate) all at once. */
  mapManyChunked(entities: TEntity[], chunkSize = DEFAULT_CHUNK_SIZE): TDto[] {
    const result: TDto[] = [];
    for (let i = 0; i < entities.length; i += chunkSize) {
      result.push(...this.mapper.toDtoList(entities.slice(i, i + chunkSize)));
    }
    return result;
  }

  mapPage(page: PaginatedResult<TEntity>): PaginatedResult<TDto> {
    return PaginatedMapper.map(page, this.mapper);
  }

  async *mapStream(entities: AsyncIterable<TEntity>): AsyncIterable<TDto> {
    for await (const entity of entities) {
      yield this.mapper.toDto(entity);
    }
  }
}
