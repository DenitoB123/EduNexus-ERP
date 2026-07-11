import { randomUUID } from 'crypto';
import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { ICqrsExecutionContext } from '../interfaces/cqrs-context.interface';
import { TenantContextService } from '../../../database/context/tenant-context.service';

/**
 * Builds an `ICqrsExecutionContext` from whatever the current request
 * has available: `request.tenantContext` (populated by
 * `TenantIsolationMiddleware`, B1.2) for tenancy, and
 * `request.authContext` (the extension point declared in
 * `common/decorators/current-user.decorator.ts`) for identity/roles/
 * permissions once an Auth module populates it. Nothing here resolves
 * identity itself — same "infrastructure only" boundary
 * `TenantContextService` already documents for itself.
 *
 * For CQRS dispatch that doesn't happen inside an HTTP request (a
 * scheduled job, a queue consumer), use `fromTenantContext()` instead,
 * which reads from the `TenantContextService` AsyncLocalStorage
 * directly.
 */
@Injectable()
export class CqrsContextFactory {
  constructor(private readonly tenantContextService: TenantContextService) {}

  fromRequest(request: Request): ICqrsExecutionContext {
    const tenantContext = request.tenantContext;
    const authContext = request.authContext;

    return {
      tenantId: tenantContext?.tenantId,
      schoolGroupId: tenantContext?.schoolGroupId,
      schoolId: tenantContext?.schoolId,
      campusId: tenantContext?.campusId,
      actorId: authContext?.userId ?? tenantContext?.actorId,
      correlationId: tenantContext?.correlationId ?? randomUUID(),
      roles: authContext?.roles,
      permissions: authContext?.permissions,
      isAuthContextMissing: !authContext,
    };
  }

  fromTenantContext(): ICqrsExecutionContext {
    const tenantContext = this.tenantContextService.getContext();

    return {
      tenantId: tenantContext?.tenantId,
      schoolGroupId: tenantContext?.schoolGroupId,
      schoolId: tenantContext?.schoolId,
      campusId: tenantContext?.campusId,
      actorId: tenantContext?.actorId,
      correlationId: tenantContext?.correlationId ?? randomUUID(),
      isAuthContextMissing: true,
    };
  }
}
