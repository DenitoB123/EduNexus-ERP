import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

export class ConflictException extends BaseException {
  constructor(message: string, details?: unknown) {
    super(ERROR_CODES.RESOURCE_CONFLICT, message, HttpStatus.CONFLICT, details);
  }
}
