import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../rbac/decorators/roles.decorator';
import { FeatureFlagsService } from './feature-flags.service';
import { UpsertFeatureFlagDto, SetFeatureFlagOverrideDto } from './dto/upsert-feature-flag.dto';

@ApiTags('Feature Flags')
@Controller('api/v1/feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlags: FeatureFlagsService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'List all feature flags and their overrides' })
  list() {
    return this.featureFlags.list();
  }

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create or update a feature flag definition' })
  upsert(@Body() dto: UpsertFeatureFlagDto) {
    return this.featureFlags.upsert(dto);
  }

  @Post(':key/overrides')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Set a per-school or per-user override (e.g. pilot school rollout)' })
  setOverride(@Param('key') key: string, @Body() dto: SetFeatureFlagOverrideDto) {
    return this.featureFlags.setOverride(key, dto);
  }
}
