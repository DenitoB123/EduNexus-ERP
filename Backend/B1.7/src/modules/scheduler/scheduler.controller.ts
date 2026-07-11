import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../rbac/decorators/roles.decorator';
import { SchedulerService } from './scheduler.service';

@ApiTags('Scheduler')
@Controller('api/v1/scheduler')
export class SchedulerController {
  constructor(private readonly scheduler: SchedulerService) {}

  @Get('runs')
  @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
  @ApiOperation({ summary: 'List recent scheduled task runs (audit/diagnostic view)' })
  async listRuns(@Query('taskName') taskName?: string, @Query('limit') limit?: string) {
    return this.scheduler.getRecentRuns(taskName, limit ? parseInt(limit, 10) : undefined);
  }
}
