import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from '../feature-flags.service';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { FeatureNotAvailableException } from '../../../exceptions/domain.exception';

@Injectable()
export class FeatureFlagsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const flagKey = this.reflector.getAllAndOverride<string>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!flagKey) return true;

    const request = context.switchToHttp().getRequest();
    const schoolId: string | undefined = request.user?.schoolId ?? request.tenantId;
    const userId: string | undefined = request.user?.id;

    const enabled = await this.featureFlags.isEnabled(flagKey, { schoolId, userId });
    if (!enabled) {
      throw new FeatureNotAvailableException(flagKey, { schoolId });
    }
    return true;
  }
}
