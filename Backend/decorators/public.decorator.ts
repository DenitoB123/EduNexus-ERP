import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as publicly accessible, bypassing the JwtAuthGuard.
 * No authentication logic is implemented yet — this decorator exists
 * as foundation scaffolding for Phase 2 (Authentication & Users).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
