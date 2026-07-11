import { ValidationError } from '@nestjs/common';
import { ValidationHelper } from '../../common/validators/validation.helper';
import { createGlobalValidationPipe, createValidationPipeOptions } from '../../common/pipes/validation.pipe';

export { ValidationHelper as ApiValidationHelper };
export { createGlobalValidationPipe, createValidationPipeOptions };

export class ApiValidationUtils {
  static formatErrors(errors: ValidationError[]): Record<string, string[]> {
    return ValidationHelper.flattenErrors(errors);
  }
}
