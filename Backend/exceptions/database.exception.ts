import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

export class DatabaseException extends BaseException {
  constructor(message: string, details?: unknown) {
    super(ERROR_CODES.DATABASE_ERROR, message, HttpStatus.INTERNAL_SERVER_ERROR, details);
  }
}
