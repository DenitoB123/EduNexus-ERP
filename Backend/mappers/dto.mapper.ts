import { ObjectUtil } from '../utils/object.util';

export class DtoMapper {
  static toEntityShape<T extends object, K extends keyof T>(
    dto: T,
    allowedFields: K[],
  ): Pick<T, K> {
    return ObjectUtil.pick(dto, allowedFields);
  }
}
