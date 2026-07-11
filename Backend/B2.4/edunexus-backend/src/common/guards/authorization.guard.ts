/**
 * authorization.guard.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * Single reusable guard every generic/business controller relies on for
 * authorization. It does NOT authenticate the request itself (verifying
 * credentials and populating `request.user`/`request.tenant` is the
 * Authentication/Multi-tenancy infrastructure's job from earlier
 * milestones, expected to run upstream as global middleware or a
 * dedicated auth guard). This guard's job is narrower and fully generic:
 *
 *   1. Skip everything if `@Public()` is set.
 *   2. Reject if `request.user` is missing (auth didn't run / failed upstream).
 *   3. Reject if tenant context is required (default) but missing.
 *   4. Reject if `@Permissions(...)` is set and the actor lacks all of them,
 *      delegating the actual check to IPermissionChecker (B2.3 extension
 *      point, backed by the real RBAC infrastructure once wired).
 */

import { CanActivate, ExecutionContext, Inject, Injectable, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, REQUIRED_PERMISSIONS_KEY, REQUIRE_TENANT_KEY } from '../decorators/authorization.decorators';
import { IAuthenticatedRequest } from '../interfaces/controller.interfaces';
import { PERMISSION_CHECKER } from '../interfaces/tokens';
import { IPermissionChecker } from '../interfaces/infrastructure.interfaces';
import { ForbiddenServiceException } from '../exceptions/service.exceptions';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject(PERMISSION_CHECKER) private readonly permissionChecker?: IPermissionChecker,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<IAuthenticatedRequest>();

    if (!request.user) {
      throw new ForbiddenServiceException(
        'Authentication is required for this endpoint but no authenticated actor was found on the request.',
      );
    }

    const requireTenant = this.reflector.getAllAndOverride<boolean>(REQUIRE_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? true;

    if (requireTenant && !request.tenant) {
      throw new ForbiddenServiceException('Tenant context is required for this endpoint but none was found on the request.');
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredPermissions && requiredPermissions.length > 0) {
      if (!this.permissionChecker) {
        throw new ForbiddenServiceException(
          'This endpoint requires permission checks but no IPermissionChecker is wired (PERMISSION_CHECKER token). ' +
            'Provide the real RBAC implementation from the Auth/RBAC infrastructure.',
        );
      }
      const allowed = await this.permissionChecker.hasAnyPermission(
        request.user.userId,
        requiredPermissions,
        request.user.roles ?? [],
      );
      if (!allowed) {
        throw new ForbiddenServiceException('You do not have permission to perform this action.', {
          requiredPermissions,
        });
      }
    }

    return true;
  }
}
