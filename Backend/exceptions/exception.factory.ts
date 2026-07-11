import { BaseException } from './base.exception';
import { BusinessException } from './business.exception';
import { ValidationException } from './validation.exception';
import { ConflictException } from './conflict.exception';
import { ResourceNotFoundException } from './resource-not-found.exception';
import { ForbiddenException } from './forbidden.exception';
import { InfrastructureException } from './infrastructure.exception';
import { DatabaseException } from './database.exception';

export class ExceptionFactory {
  static notFound(resource: string, identifier: string): BaseException {
    return new ResourceNotFoundException(resource, identifier);
  }

  static conflict(message: string, details?: unknown): BaseException {
    return new ConflictException(message, details);
  }

  static validation(message: string, details?: unknown): BaseException {
    return new ValidationException(message, details);
  }

  static business(message: string, details?: unknown): BaseException {
    return new BusinessException(message, details);
  }

  static forbidden(message?: string): BaseException {
    return new ForbiddenException(message);
  }

  static infrastructure(message: string, details?: unknown): BaseException {
    return new InfrastructureException(message, details);
  }

  static database(message: string, details?: unknown): BaseException {
    return new DatabaseException(message, details);
  }
}
