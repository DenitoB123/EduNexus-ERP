import { Controller, Get, Param, Query, Version } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { Roles } from '../rbac/decorators/roles.decorator';

@Controller('audit-logs')
@Version('1')
@Roles('admin', 'super-admin')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  query(@Query() filters: QueryAuditLogDto) {
    return this.auditLogService.query(filters);
  }

  @Get(':entity/:entityId')
  findForEntity(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditLogService.findForEntity(entity, entityId);
  }
}
