import { SetMetadata } from '@nestjs/common';

/**
 * Command/Query-side analog of
 * `common/decorators/require-access.decorator.ts`. That decorator is
 * for HTTP controller methods (read via `Reflector.getAllAndOverride`
 * against the Express execution context); this one annotates a
 * *command or query class* so `CommandAuthorizationBehavior`/
 * `QueryAuthorizationBehavior` can check required roles/permissions
 * even when the command/query is dispatched from somewhere that isn't
 * an HTTP controller (a queue consumer, a scheduled job, another
 * command handler composing a sub-command).
 *
 * Deliberately a separate, small metadata key rather than reusing
 * `REQUIRED_PERMISSIONS_KEY`/`REQUIRED_ROLES_KEY` — those are read via
 * `getAllAndOverride([handler, class])`, an HTTP-specific two-level
 * lookup that doesn't apply to a bare command/query class. One pair of
 * keys/decorators is shared by both commands and queries since the
 * check itself (roles/permissions membership) is identical either way.
 */
export const REQUIRED_CQRS_ROLES_KEY = 'edunexus:cqrs:required-roles';
export const REQUIRED_CQRS_PERMISSIONS_KEY = 'edunexus:cqrs:required-permissions';

export const RequireRolesForCqrs = (...roles: string[]): ClassDecorator =>
  SetMetadata(REQUIRED_CQRS_ROLES_KEY, roles);

export const RequirePermissionsForCqrs = (...permissions: string[]): ClassDecorator =>
  SetMetadata(REQUIRED_CQRS_PERMISSIONS_KEY, permissions);
