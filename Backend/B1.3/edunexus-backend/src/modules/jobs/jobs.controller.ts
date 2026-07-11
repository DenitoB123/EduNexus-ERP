import { Controller, Get, Param, Query, Version } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { Roles } from '../rbac/decorators/roles.decorator';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { RequestUser } from '../auth/strategies/jwt.strategy';

@Controller('jobs')
@Version('1')
@Roles('admin', 'super-admin')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.jobsService.listForSchool(user.schoolId, page, limit);
  }

  @Get(':id')
  getStatus(@Param('id') id: string) {
    return this.jobsService.getStatus(id);
  }
}
