/**
 * tenant.service.ts
 *
 * B2.3 — Generic Service Layer — Base Service Classes
 *
 * Standalone, composable implementation of ITenantService. BaseService
 * composes an instance of this (or a subclass override) so that every
 * generic/business service gets consistent tenant/school/campus scoping
 * and validation without reimplementing it. Can also be injected directly
 * wherever tenant-scoping logic is needed outside the service layer.
 *
 * This does NOT reimplement tenancy — it assumes IRequestContext.tenant has
 * already been correctly populated by the tenancy infrastructure from
 * earlier milestones (middleware/guards resolving tenant/school/campus from
 * the authenticated request).
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { ITenantService } from '../interfaces/service.interfaces';
import { IRequestContext } from '../interfaces/context.interfaces';
import { EXCEPTION_FACTORY } from '../interfaces/tokens';
import { IExceptionFactory } from '../interfaces/infrastructure.interfaces';
import { TenantMismatchException } from '../exceptions/service.exceptions';

@Injectable()
export class TenantService implements ITenantService {
  constructor(@Optional() @Inject(EXCEPTION_FACTORY) private readonly exceptionFactory?: IExceptionFactory) {}

  validateTenantAccess(context: IRequestContext, resourceTenantId?: string): void {
    if (context.tenant.isCrossTenantOperation) {
      return;
    }
    if (!context.tenant.tenantId) {
      throw this.buildException('Request context is missing a tenant id.');
    }
    if (resourceTenantId && resourceTenantId !== context.tenant.tenantId) {
      throw this.buildException(
        `Resource belongs to tenant "${resourceTenantId}", not the current tenant "${context.tenant.tenantId}".`,
      );
    }
  }

  applyTenantScope<T extends Record<string, unknown>>(where: T, context: IRequestContext): T {
    if (context.tenant.isCrossTenantOperation) {
      return where;
    }
    const scoped: Record<string, unknown> = { ...where, tenantId: context.tenant.tenantId };
    if (context.tenant.schoolId) {
      scoped.schoolId = context.tenant.schoolId;
    }
    if (context.tenant.campusId) {
      scoped.campusId = context.tenant.campusId;
    }
    return scoped as T;
  }

  private buildException(message: string) {
    return this.exceptionFactory?.tenantMismatch(message) ?? new TenantMismatchException(message);
  }
}
