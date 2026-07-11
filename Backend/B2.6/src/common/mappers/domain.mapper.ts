/**
 * domain.mapper.ts
 *
 * Abstract base for Domain Aggregate <-> DTO mapping (IDomainMapper).
 * Distinct from BaseMapper (which is Entity <-> DTO, i.e. persistence
 * shape) because domain aggregates (see common/interfaces/domain.interfaces
 * .ts -- IAggregateRoot) often carry behavior and invariants that a plain
 * `plainToInstance` cannot reconstruct; toDomain is therefore abstract and
 * must be implemented per aggregate (typically via that aggregate's own
 * static factory, e.g. `IEntityFactory.create`), while toDto reuses
 * ObjectMapper the same way BaseMapper does.
 */

import { ClassConstructor } from 'class-transformer';
import { ObjectMapper } from './object.mapper';
import { IAggregateRoot } from '../interfaces/domain.interfaces';
import { IDomainMapper } from './mapping.interfaces';

export abstract class DomainMapper<TDomain extends IAggregateRoot<unknown>, TDto extends object>
  implements IDomainMapper<TDomain, TDto>
{
  protected constructor(protected readonly dtoClass: ClassConstructor<TDto>) {}

  abstract toDomain(dto: TDto): TDomain;

  toDto(domain: TDomain): TDto {
    return ObjectMapper.toInstance(this.dtoClass, domain as unknown as object);
  }
}
