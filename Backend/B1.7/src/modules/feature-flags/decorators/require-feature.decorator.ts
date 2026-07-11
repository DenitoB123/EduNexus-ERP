import { SetMetadata } from '@nestjs/common';

export const REQUIRE_FEATURE_KEY = 'requireFeature';

/**
 * Gates a controller method behind a feature flag, in addition to whatever
 * RBAC @Roles/@Permissions guards already apply. Resolution uses the
 * request's tenant (schoolId) and authenticated user, via FeatureFlagsGuard.
 *
 * Usage:
 *   @RequireFeature('transport.live-tracking')
 *   @Get('live')
 *   getLiveLocations() { ... }
 */
export const RequireFeature = (flagKey: string) => SetMetadata(REQUIRE_FEATURE_KEY, flagKey);
