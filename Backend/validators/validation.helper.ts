import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ValidationException } from '../exceptions/validation.exception';

export class ValidationHelper {
  static flattenErrors(errors: ValidationError[], parentPath = ''): Record<string, string[]> {
    const flattened: Record<string, string[]> = {};

    for (const error of errors) {
      const path = parentPath ? `${parentPath}.${error.property}` : error.property;

      if (error.constraints) {
        flattened[path] = Object.values(error.constraints);
      }

      if (error.children?.length) {
        Object.assign(flattened, this.flattenErrors(error.children, path));
      }
    }

    return flattened;
  }

  static async validateOrThrow<T extends object>(cls: new () => T, plain: Record<string, unknown>): Promise<T> {
    const instance = plainToInstance(cls, plain);
    const errors = await validate(instance);

    if (errors.length > 0) {
      throw new ValidationException('Validation failed', this.flattenErrors(errors));
    }

    return instance;
  }
}
