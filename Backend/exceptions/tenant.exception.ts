import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

export class TenantException extends BaseException {
  constructor(message: string) {
    super(ERROR_CODES.FORBIDDEN, message, HttpStatus.BAD_REQUEST);
  }

  static missingContext(): TenantException {
    return new TenantException('Tenant context is required but was not provided for this request');
  }

  static crossTenantAccessDenied(): TenantException {
    return new TenantException('Cross-tenant access is not permitted');
  }
}
