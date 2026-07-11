import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-access.decorator';
import { AuthorizationException } from '../exceptions/authorization.exception';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[] | undefined>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<Request>();

    if (!request.authContext) {
      this.logger.warn(
        `@RequirePermissions(${requiredPermissions.join(', ')}) declared but no auth context is present; allowing request through pending the Auth module`,
      );
      return true;
    }

    const hasAll = requiredPermissions.every((perm) => request.authContext?.permissions.includes(perm));
    if (!hasAll) {
      throw new AuthorizationException('access', context.getClass().name);
    }

    return true;
  }
}
