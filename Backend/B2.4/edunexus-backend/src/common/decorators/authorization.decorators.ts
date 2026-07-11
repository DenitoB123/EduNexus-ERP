/**
 * authorization.decorators.ts
 *
 * B2.4 — Generic Controller Layer & API Foundation
 *
 * Metadata-only decorators, read by AuthorizationGuard (../guards/
 * authorization.guard.ts) to decide whether an endpoint requires
 * authentication, which permissions it requires, and whether it requires
 * tenant context. These decorators do NOT perform authentication
 * themselves — verifying the JWT / session and populating `request.user`
 * remains the responsibility of the Authentication infrastructure from
 * earlier milestones, assumed to run upstream as global middleware/guard.
 */

import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthorizationGuard } from '../guards/authorization.guard';

export const IS_PUBLIC_KEY = 'edunexus:isPublic';
export const REQUIRED_PERMISSIONS_KEY = 'edunexus:requiredPermissions';
export const REQUIRE_TENANT_KEY = 'edunexus:requireTenant';

/** Marks an endpoint as not requiring authentication. AuthorizationGuard skips all checks when this is set. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Requires the caller to hold at least one of the given permissions (checked via the injected IPermissionChecker). */
export const Permissions = (...permissions: string[]) => SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

/**
 * Marks an endpoint as requiring tenant context (default behavior for all
 * non-public endpoints — use `@TenantProtected(false)` to explicitly opt an
 * endpoint out, e.g. a platform/super-admin cross-tenant endpoint).
 */
export const TenantProtected = (required = true) => SetMetadata(REQUIRE_TENANT_KEY, required);

/**
 * Composite decorator applying AuthorizationGuard + Swagger bearer-auth
 * documentation in one call. Equivalent to
 * `@UseGuards(AuthorizationGuard) @ApiBearerAuth()`.
 */
export const ProtectedEndpoint = (...permissions: string[]) =>
  applyDecorators(
    UseGuards(AuthorizationGuard),
    ApiBearerAuth(),
    ...(permissions.length > 0 ? [Permissions(...permissions)] : []),
  );
