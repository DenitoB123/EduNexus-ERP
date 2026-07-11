/**
 * service.exceptions.ts
 *
 * B2.3 — Generic Service Layer — Exception Handling
 *
 * Fallback exception classes used by the Generic Service Layer when no
 * IExceptionFactory has been injected (e.g. during standalone unit tests of
 * this milestone, before it is wired into the shared exception framework
 * from earlier milestones). When EXCEPTION_FACTORY *is* provided, BaseService
 * prefers it (see base.service.ts) so that all exceptions across the whole
 * backend share one standardized shape.
 *
 * These classes intentionally mirror the IEnterpriseException contract so
 * that swapping in the real factory later is a drop-in change.
 */

import { IEnterpriseException } from '../interfaces/infrastructure.interfaces';

abstract class BaseServiceException extends Error implements IEnterpriseException {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  details?: Record<string, unknown>;

  protected constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class EntityNotFoundException extends BaseServiceException {
  readonly code = 'ENTITY_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(entity: string, id: unknown) {
    super(`${entity} with id "${String(id)}" was not found.`, { entity, id });
    this.name = 'EntityNotFoundException';
  }
}

export class EntityConflictException extends BaseServiceException {
  readonly code = 'ENTITY_CONFLICT';
  readonly httpStatus = 409;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'EntityConflictException';
  }
}

export class ServiceValidationException extends BaseServiceException {
  readonly code = 'VALIDATION_FAILED';
  readonly httpStatus = 400;

  constructor(errors: Record<string, string[]> | string[], message = 'Validation failed.') {
    super(message, { errors });
    this.name = 'ServiceValidationException';
  }
}

export class TenantMismatchException extends BaseServiceException {
  readonly code = 'TENANT_MISMATCH';
  readonly httpStatus = 403;

  constructor(message = 'Resource does not belong to the current tenant.') {
    super(message);
    this.name = 'TenantMismatchException';
  }
}

export class ForbiddenServiceException extends BaseServiceException {
  readonly code = 'FORBIDDEN';
  readonly httpStatus = 403;

  constructor(message = 'You do not have permission to perform this action.', details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'ForbiddenServiceException';
  }
}

export class ServiceInternalException extends BaseServiceException {
  readonly code = 'INTERNAL_ERROR';
  readonly httpStatus = 500;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
    this.name = 'ServiceInternalException';
  }
}
