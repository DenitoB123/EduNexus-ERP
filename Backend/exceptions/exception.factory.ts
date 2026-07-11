import { BaseException } from './base.exception';
import { BusinessException } from './business.exception';
import { ValidationException } from './validation.exception';
import { ConflictException } from './conflict.exception';
import { ResourceNotFoundException } from './resource-not-found.exception';
import { ForbiddenException } from './forbidden.exception';
import { InfrastructureException } from './infrastructure.exception';
import { DatabaseException } from './database.exception';
import { EntityNotFoundException } from './entity-not-found.exception';
import { DuplicateEntityException } from './duplicate-entity.exception';
import { AuthorizationException } from './authorization.exception';
import { TenantException } from './tenant.exception';
import { ConfigurationException } from './configuration.exception';

export class ExceptionFactory {
  static notFound(resource: string, identifier: string): BaseException {
    return new ResourceNotFoundException(resource, identifier);
  }

  static entityNotFound(entityName: string, identifier: string): BaseException {
    return new EntityNotFoundException(entityName, identifier);
  }

  static duplicateEntity(entityName: string, field: string, value: string): BaseException {
    return new DuplicateEntityException(entityName, field, value);
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

  static unauthorizedAction(action: string, resource?: string): BaseException {
    return new AuthorizationException(action, resource);
  }

  static tenant(message: string): BaseException {
    return new TenantException(message);
  }

  static configuration(message: string): BaseException {
    return new ConfigurationException(message);
  }

  static infrastructure(message: string, details?: unknown): BaseException {
    return new InfrastructureException(message, details);
  }

  static database(message: string, details?: unknown): BaseException {
    return new DatabaseException(message, details);
  }
}
