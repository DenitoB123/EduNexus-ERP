import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

export class ResourceNotFoundException extends BaseException {
  constructor(resource: string, identifier: string) {
    super(
      ERROR_CODES.RESOURCE_NOT_FOUND,
      `${resource} with identifier "${identifier}" was not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}
