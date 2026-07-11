import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../rbac/decorators/roles.decorator';
import { QaService } from './qa.service';

@ApiTags('Quality Assurance')
@Controller('api/v1/quality-assurance')
export class QaController {
  constructor(private readonly qa: QaService) {}

  @Get('checks')
  @Roles('SUPER_ADMIN')
  listChecks() {
    return this.qa.listAvailableChecks();
  }

  @Post('checks/run')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Run every registered QA check on demand' })
  runAll() {
    return this.qa.runAll();
  }

  @Post('checks/:name/run')
  @Roles('SUPER_ADMIN')
  runOne(@Param('name') name: string) {
    return this.qa.runByName(name);
  }

  @Get('history')
  @Roles('SUPER_ADMIN')
  history(@Query('checkName') checkName?: string, @Query('limit') limit?: string) {
    return this.qa.getHistory(checkName, limit ? parseInt(limit, 10) : undefined);
  }
}
