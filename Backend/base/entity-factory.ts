import { IEntityFactory } from '../interfaces/domain.interfaces';

/**
 * Base class for entity factories. Concrete factories should be the
 * only place a new aggregate/entity is constructed, keeping default
 * values, ID generation, and invariant checks in one place instead of
 * scattered across services.
 */
export abstract class EntityFactory<TEntity, TCreateProps> implements IEntityFactory<TEntity, TCreateProps> {
  abstract create(props: TCreateProps): TEntity;
}
