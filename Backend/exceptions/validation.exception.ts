import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

export class ValidationException extends BaseException {
  constructor(message: string, details?: unknown) {
    super(ERROR_CODES.VALIDATION_FAILED, message, HttpStatus.BAD_REQUEST, details);
  }
}
