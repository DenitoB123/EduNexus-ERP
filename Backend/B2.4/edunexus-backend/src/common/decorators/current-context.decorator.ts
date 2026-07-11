/**
 * current-context.decorator.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * Injects a ready-to-use IRequestContext (see B2.3's context.interfaces.ts)
 * directly into a controller method parameter, built from the request via
 * buildRequestContext (../utils/request-context.util.ts). Business modules
 * writing custom (non-generic) endpoints use this instead of manually
 * reading `request.user` / `request.tenant`.
 *
 * Usage:
 *   @Get('me')
 *   whoAmI(@CurrentContext() context: IRequestContext) { ... }
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IAuthenticatedRequest } from '../interfaces/controller.interfaces';
import { buildRequestContext } from '../utils/request-context.util';

export const CurrentContext = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<IAuthenticatedRequest>();
  return buildRequestContext(request);
});

/** Injects the raw actor (current user) from the request, without building the full context. */
export const CurrentActor = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<IAuthenticatedRequest>();
  return request.user;
});
