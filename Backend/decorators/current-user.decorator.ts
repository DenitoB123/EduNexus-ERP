import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Shape a future Authentication/Users module (B2.x/B3) is expected to
 * populate onto `request.authContext`, analogous to how
 * TenantIsolationMiddleware populates `request.tenantContext` (B1.2).
 * Nothing in the current codebase sets this yet — these decorators
 * are inert extension points, not an authentication implementation.
 */
export interface AuthContext {
  userId: string;
  roles: string[];
  permissions: string[];
}

declare module 'express' {
  interface Request {
    authContext?: AuthContext;
  }
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): string | undefined => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.authContext?.userId;
});

export const CurrentRole = createParamDecorator((_: unknown, ctx: ExecutionContext): string[] => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.authContext?.roles ?? [];
});

export const CurrentPermissions = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string[] => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.authContext?.permissions ?? [];
  },
);
