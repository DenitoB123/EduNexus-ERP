import { ClassConstructor } from 'class-transformer';
import { BaseModel } from '../../database/interfaces/base-model.interface';
import { ObjectMapper } from './object.mapper';
import { IMapper } from './mapper.interface';

export abstract class EntityMapper<TEntity extends BaseModel, TResponse>
  implements IMapper<TEntity, TResponse>
{
  protected abstract readonly responseClass: ClassConstructor<TResponse>;

  toResponse(entity: TEntity): TResponse {
    return ObjectMapper.toInstance(this.responseClass, entity as unknown as object);
  }

  toResponseList(entities: TEntity[]): TResponse[] {
    return entities.map((entity) => this.toResponse(entity));
  }
}
