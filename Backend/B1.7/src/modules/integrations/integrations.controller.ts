import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../rbac/decorators/roles.decorator';
import { IntegrationsService } from './integrations.service';
import { UpsertIntegrationConfigDto } from './dto/upsert-integration-config.dto';

@ApiTags('Integrations')
@Controller('api/v1/integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get('configs')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'List integration configs for the current tenant (credentials never included)' })
  list(@Req() req: any) {
    return this.integrations.list(req.user?.schoolId);
  }

  @Post('configs')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'Create/update a provider config (payment gateway, SMS, email, ...). Credentials encrypted at rest.' })
  upsert(@Req() req: any, @Body() dto: UpsertIntegrationConfigDto) {
    return this.integrations.upsertConfig(req.user?.schoolId, dto, req.user?.id);
  }
}
