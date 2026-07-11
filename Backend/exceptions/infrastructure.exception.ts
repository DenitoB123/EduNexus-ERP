import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

export class InfrastructureException extends BaseException {
  constructor(message: string, details?: unknown) {
    super(ERROR_CODES.INFRASTRUCTURE_ERROR, message, HttpStatus.SERVICE_UNAVAILABLE, details);
  }
}
