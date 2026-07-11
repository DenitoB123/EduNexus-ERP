/**
 * serialization.service.ts
 *
 * Concrete `ISerializationService`. Two paths:
 *   - Decorated class instances (have @Expose/@Exclude via class-transformer)
 *     -> instanceToPlain, which already handles nested objects and groups
 *     natively; circular refs among CLASS instances are also handled by
 *     class-transformer itself.
 *   - Plain objects (JSON already, or objects with no class-transformer
 *     decorators) -> stripCircular first (B2.6's circular-ref requirement
 *     for this path), since instanceToPlain on a plain object is a no-op
 *     that would NOT protect against cycles.
 * Then property include/exclude filtering is applied uniformly to the
 * result of either path.
 */

import { Injectable } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { ISerializationOptions, ISerializationService } from '../mappers/mapping.interfaces';
import { stripCircular } from './circular-reference.guard';
import { filterProperties } from './property-filter.util';

@Injectable()
export class SerializationService implements ISerializationService {
  serialize<T extends object>(input: T, options?: ISerializationOptions): Record<string, unknown> {
    const isDecoratedInstance = input?.constructor && input.constructor !== Object;

    const plain = isDecoratedInstance
      ? instanceToPlain(input, { groups: options?.groups, excludeExtraneousValues: false })
      : options?.protectCircular === false
        ? (input as unknown as Record<string, unknown>)
        : stripCircular(input as unknown as Record<string, unknown>);

    return filterProperties(plain as Record<string, unknown>, options);
  }

  serializeList<T extends object>(inputs: T[], options?: ISerializationOptions): Record<string, unknown>[] {
    return inputs.map((input) => this.serialize(input, options));
  }
}
