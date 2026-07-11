/**
 * mapping.interfaces.ts
 *
 * Extends the existing `IMapper<TEntity, TResponse>` (mapper.interface.ts,
 * B2.2) with the additional shared contracts B2.6 introduces. Kept in the
 * same `mappers/` folder as `mapper.interface.ts` rather than
 * `common/interfaces/`, matching the file-location convention already
 * established for mapper-specific interfaces in this project.
 */

import { IAggregateRoot } from '../interfaces/domain.interfaces';
import { PaginatedResult, PaginationInput } from '../../database/interfaces/base-model.interface';

/** Entity -> DTO direction, mirrors IMapper but named explicitly for DI-token/profile registration clarity. */
export interface IEntityMapper<TEntity, TDto> {
  toDto(entity: TEntity): TDto;
  toDtoList(entities: TEntity[]): TDto[];
}

/** DTO -> Entity direction (create/update DTO -> persistence shape). */
export interface IDtoMapper<TDto, TEntity> {
  toEntity(dto: TDto): Partial<TEntity>;
}

/** Entity/Domain -> API response envelope direction, including paginated responses. */
export interface IResponseMapper<TEntity, TResponse> {
  toResponse(entity: TEntity): TResponse;
  toPaginatedResponse(page: PaginatedResult<TEntity>): PaginatedResult<TResponse>;
}

/** Domain aggregate <-> DTO direction, for modules built around IAggregateRoot (see common/interfaces/domain.interfaces.ts). */
export interface IDomainMapper<TDomain extends IAggregateRoot<unknown>, TDto> {
  toDomain(dto: TDto): TDomain;
  toDto(domain: TDomain): TDto;
}

/**
 * Named, composable transformation pipeline (create DTO -> domain,
 * domain -> response DTO, etc). Distinct from IMapper/IEntityMapper in
 * that a single service can register several transforms under different
 * names rather than being tied to one entity/DTO pair.
 */
export interface ITransformationService {
  register<TInput, TOutput>(name: string, transform: (input: TInput) => TOutput): void;
  transform<TInput, TOutput>(name: string, input: TInput): TOutput;
  transformBatch<TInput, TOutput>(name: string, inputs: TInput[]): TOutput[];
}

export interface ISerializationOptions {
  /** Property names to exclude from output, regardless of decorators. */
  exclude?: string[];
  /** If set, ONLY these properties are included (applied after exclude). */
  include?: string[];
  /** class-transformer groups, for @Expose({ groups: [...] }) conditional fields. */
  groups?: string[];
  /** Guard against circular references when serializing plain (non-decorated) objects. Default: true. */
  protectCircular?: boolean;
}

export interface ISerializationService {
  serialize<T extends object>(input: T, options?: ISerializationOptions): Record<string, unknown>;
  serializeList<T extends object>(inputs: T[], options?: ISerializationOptions): Record<string, unknown>[];
}

/** Batch/collection mapping over any IEntityMapper, including paginated and streamed variants. */
export interface ICollectionMapper<TEntity, TDto> {
  mapMany(entities: TEntity[]): TDto[];
  mapPage(page: PaginatedResult<TEntity>): PaginatedResult<TDto>;
  mapStream(entities: AsyncIterable<TEntity>): AsyncIterable<TDto>;
}

export type { PaginatedResult, PaginationInput };
