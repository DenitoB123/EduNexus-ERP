import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

/**
 * DDD-flavored alias of ResourceNotFoundException with identical
 * semantics (same error code, same HTTP status) — kept as a distinct
 * class only so domain/application layers can express intent using
 * DDD terminology ("entity") consistently with AggregateRoot/
 * EntityFactory, while the HTTP layer sees the same error contract.
 */
export class EntityNotFoundException extends BaseException {
  constructor(entityName: string, identifier: string) {
    super(
      ERROR_CODES.RESOURCE_NOT_FOUND,
      `${entityName} with identifier "${identifier}" was not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}
