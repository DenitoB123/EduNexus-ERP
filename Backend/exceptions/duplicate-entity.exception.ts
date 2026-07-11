import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

export class DuplicateEntityException extends BaseException {
  constructor(entityName: string, field: string, value: string) {
    super(
      ERROR_CODES.RESOURCE_CONFLICT,
      `${entityName} with ${field} "${value}" already exists`,
      HttpStatus.CONFLICT,
    );
  }
}
