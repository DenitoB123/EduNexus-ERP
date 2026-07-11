/**
 * base.mapper.ts
 *
 * Abstract base every future business-module mapper should extend, per
 * the B2.6 requirement that "business modules must inherit these" rather
 * than writing mapping logic from scratch. Built on top of the existing
 * `ObjectMapper` (B2.2) rather than reimplementing plain-object <-> class
 * conversion.
 *
 * A concrete module mapper only needs to supply its DTO class and, where
 * property names/shapes diverge, override `toEntity`/`toDto`:
 *
 *   class StudentMapper extends BaseMapper<StudentEntity, StudentResponseDto> {
 *     constructor() { super(StudentResponseDto); }
 *   }
 */

import { ClassConstructor } from 'class-transformer';
import { ObjectMapper } from './object.mapper';
import { IEntityMapper } from './mapping.interfaces';

export abstract class BaseMapper<TEntity extends object, TDto extends object> implements IEntityMapper<TEntity, TDto> {
  protected constructor(protected readonly dtoClass: ClassConstructor<TDto>) {}

  toDto(entity: TEntity): TDto {
    return ObjectMapper.toInstance(this.dtoClass, entity);
  }

  toDtoList(entities: TEntity[]): TDto[] {
    return entities.map((e) => this.toDto(e));
  }
}
