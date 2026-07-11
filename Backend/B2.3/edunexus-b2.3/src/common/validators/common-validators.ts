/**
 * common-validators.ts
 *
 * B2.3 — Generic Service Layer — Business Validation Layer
 *
 * Abstract, reusable validators for the cross-cutting checks every business
 * module needs (duplicate detection, tenant validation, permission
 * validation). Business modules extend these with entity-specific details
 * (which fields form a uniqueness constraint, which permission string
 * applies, etc.) rather than writing duplicate/tenant/permission logic from
 * scratch.
 *
 * These depend on IBaseRepository and IPermissionChecker as extension
 * points — concrete instances come from B2.2 (repository) and the RBAC
 * infrastructure, injected by the consuming business module.
 */

import { IValidator, IValidationResult, ValidationStage, validationOk, validationFail } from './validation.interface';
import { IRequestContext } from '../interfaces/context.interfaces';
import { IBaseRepository } from '../interfaces/repository.interfaces';
import { IPermissionChecker } from '../interfaces/infrastructure.interfaces';

/**
 * Base class for duplicate-detection validators. Subclasses define the
 * uniqueness constraint by implementing buildWhereClause().
 */
export abstract class DuplicateValidatorBase<TPayload, TEntity, TId = string> implements IValidator<TPayload> {
  abstract readonly name: string;
  readonly stage: ValidationStage = 'duplicate';

  constructor(
    protected readonly repository: IBaseRepository<TEntity, TId>,
    protected readonly fieldLabel: string,
  ) {}

  /** Build the uniqueness where-clause for the given payload (e.g. { email: payload.email }). */
  protected abstract buildWhereClause(payload: TPayload, context: IRequestContext): Record<string, unknown>;

  /** Optionally exclude the current record's id when validating updates. Override in update-specific subclasses. */
  protected excludeId(): unknown | undefined {
    return undefined;
  }

  async validate(payload: TPayload, context: IRequestContext): Promise<IValidationResult> {
    const where = this.buildWhereClause(payload, context);
    const excludeId = this.excludeId();
    const finalWhere = excludeId !== undefined ? { ...where, id: { not: excludeId } } : where;

    const exists = await this.repository.exists(finalWhere, context.tenant.tenantId);
    if (exists) {
      return validationFail([
        {
          field: this.fieldLabel,
          message: `A record with this ${this.fieldLabel} already exists.`,
          code: 'DUPLICATE',
        },
      ]);
    }
    return validationOk();
  }
}

/**
 * Base class for tenant-scope validators. Ensures the payload/resource
 * belongs to the tenant in the current request context.
 */
export abstract class TenantValidatorBase<TPayload> implements IValidator<TPayload> {
  abstract readonly name: string;
  readonly stage: ValidationStage = 'tenant';

  /** Extract the tenant id the payload/resource claims to belong to. */
  protected abstract resolveResourceTenantId(payload: TPayload, context: IRequestContext): string | undefined;

  validate(payload: TPayload, context: IRequestContext): IValidationResult {
    if (context.tenant.isCrossTenantOperation) {
      return validationOk();
    }
    const resourceTenantId = this.resolveResourceTenantId(payload, context);
    if (resourceTenantId && resourceTenantId !== context.tenant.tenantId) {
      return validationFail([
        {
          field: 'tenantId',
          message: 'Resource does not belong to the current tenant.',
          code: 'TENANT_MISMATCH',
        },
      ]);
    }
    return validationOk();
  }
}

/**
 * Base class for permission validators. Subclasses specify the required
 * permission string(s); the actual check is delegated to IPermissionChecker
 * (RBAC infrastructure, injected).
 */
export abstract class PermissionValidatorBase<TPayload> implements IValidator<TPayload> {
  abstract readonly name: string;
  readonly stage: ValidationStage = 'permission';

  constructor(
    protected readonly permissionChecker: IPermissionChecker,
    protected readonly requiredPermission: string | string[],
  ) {}

  async validate(_payload: TPayload, context: IRequestContext): Promise<IValidationResult> {
    if (context.actor.isSystemActor) {
      return validationOk();
    }

    const allowed = Array.isArray(this.requiredPermission)
      ? await this.permissionChecker.hasAnyPermission(context.actor.userId, this.requiredPermission, context.actor.roles)
      : await this.permissionChecker.hasPermission(context.actor.userId, this.requiredPermission, context.actor.roles);

    if (!allowed) {
      return validationFail([
        {
          field: 'permission',
          message: 'You do not have permission to perform this action.',
          code: 'FORBIDDEN',
        },
      ]);
    }
    return validationOk();
  }
}

/**
 * Base class for cross-entity validators (e.g. "the referenced campus must
 * belong to the same school"). Subclasses implement the actual cross-entity
 * lookup, typically via other injected repositories.
 */
export abstract class CrossEntityValidatorBase<TPayload> implements IValidator<TPayload> {
  abstract readonly name: string;
  readonly stage: ValidationStage = 'crossEntity';
  abstract validate(payload: TPayload, context: IRequestContext): Promise<IValidationResult> | IValidationResult;
}
