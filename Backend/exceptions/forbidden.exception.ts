import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

export class ForbiddenException extends BaseException {
  constructor(message = 'You do not have permission to perform this action') {
    super(ERROR_CODES.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}
