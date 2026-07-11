import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRED_ROLES_KEY } from '../decorators/require-access.decorator';
import { AuthorizationException } from '../exceptions/authorization.exception';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<Request>();

    if (!request.authContext) {
      // No Auth/Users module exists yet (B1.1-B1.6, B2.1). Until one
      // populates request.authContext, this guard cannot evaluate
      // role requirements and must not silently block every request
      // that declares @RequireRoles — it logs and allows through.
      this.logger.warn(
        `@RequireRoles(${requiredRoles.join(', ')}) declared but no auth context is present; allowing request through pending the Auth module`,
      );
      return true;
    }

    const hasRole = requiredRoles.some((role) => request.authContext?.roles.includes(role));
    if (!hasRole) {
      throw new AuthorizationException('access', context.getClass().name);
    }

    return true;
  }
}
