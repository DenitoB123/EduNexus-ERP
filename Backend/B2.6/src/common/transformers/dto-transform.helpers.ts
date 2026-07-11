/**
 * dto-transform.helpers.ts
 *
 * Thin, named convenience wrappers over the existing `DtoMapper`/
 * `ObjectMapper` (B2.2) for the specific Create DTO / Update DTO /
 * Response DTO transforms the B2.6 spec calls out, so business modules
 * register these with TransformationService instead of writing the same
 * three-line wrapper per entity.
 */

import { ClassConstructor } from 'class-transformer';
import { ObjectMapper } from '../mappers/object.mapper';
import { DtoMapper } from '../mappers/dto.mapper';

/** Create DTO -> entity-shaped partial, dropping fields not present on the entity (e.g. confirmPassword). */
export function createDtoToEntity<TDto extends object, TEntity extends object>(
  dto: TDto,
  entityKeys: (keyof TEntity)[],
): Partial<TEntity> {
  return DtoMapper.toEntityShape(dto as unknown as TEntity, entityKeys);
}

/** Update DTO -> partial entity patch, stripping undefined fields so a PATCH doesn't null out untouched columns. */
export function updateDtoToPatch<TDto extends Record<string, unknown>>(dto: TDto): Partial<TDto> {
  const patch: Partial<TDto> = {};
  for (const [key, value] of Object.entries(dto)) {
    if (value !== undefined) {
      (patch as Record<string, unknown>)[key] = value;
    }
  }
  return patch;
}

/** Entity/domain object -> Response DTO instance, via the existing ObjectMapper. */
export function toResponseDto<T, TDto>(cls: ClassConstructor<TDto>, source: T & object): TDto {
  return ObjectMapper.toInstance(cls, source);
}
