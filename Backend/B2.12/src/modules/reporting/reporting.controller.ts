import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-access.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCampus, CurrentSchool, CurrentSchoolGroup, CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ReportingService } from './reporting.service';
import { TemplateService } from './templates/template.service';
import { ScheduledReportService } from './scheduler/scheduled-report.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportExecutionQueryDto } from './dto/report-query.dto';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { UpdateReportTemplateDto } from './dto/update-report-template.dto';
import { CreateScheduledReportDto } from './dto/create-scheduled-report.dto';
import { UpdateScheduledReportDto } from './dto/update-scheduled-report.dto';
import { REPORT_PERMISSIONS } from './constants/report-permissions.constants';
import { TenantScope } from './report-engine/report.builder';

/**
 * All routes are already covered by the globally-registered
 * JwtAuthGuard (see app.module.ts's APP_GUARD providers); this
 * controller additionally applies PermissionsGuard + per-route
 * @RequirePermissions(), consistent with common/guards' RBAC pattern.
 */
@Controller('reporting')
@UseGuards(PermissionsGuard)
export class ReportingController {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly templateService: TemplateService,
    private readonly scheduledReportService: ScheduledReportService,
  ) {}

  private scope(tenantId: string, schoolGroupId?: string, schoolId?: string, campusId?: string): TenantScope {
    return { tenantId, schoolGroupId, schoolId, campusId };
  }

  // ---------------------------------------------------------------
  // Report definitions & datasets
  // ---------------------------------------------------------------

  @Get('reports')
  @RequirePermissions(REPORT_PERMISSIONS.GENERATE)
  listReportDefinitions(@Query('moduleKey') moduleKey?: string) {
    return this.reportingService.listReportDefinitions(moduleKey);
  }

  @Get('datasets')
  @RequirePermissions(REPORT_PERMISSIONS.DATASET_VIEW)
  listDatasets() {
    return this.reportingService.listDatasets();
  }

  // ---------------------------------------------------------------
  // Generation & executions
  // ---------------------------------------------------------------

  @Post('reports/:reportKey/generate')
  @RequirePermissions(REPORT_PERMISSIONS.GENERATE)
  generateReport(
    @Param('reportKey') reportKey: string,
    @Body() dto: GenerateReportDto,
    @CurrentTenant() tenantId: string,
    @CurrentSchoolGroup() schoolGroupId: string | undefined,
    @CurrentSchool() schoolId: string | undefined,
    @CurrentCampus() campusId: string | undefined,
    @CurrentUser() userId: string | undefined,
  ) {
    return this.reportingService.generateReport(this.scope(tenantId, schoolGroupId, schoolId, campusId), userId, reportKey, dto);
  }

  @Get('executions')
  @RequirePermissions(REPORT_PERMISSIONS.VIEW_EXECUTION)
  listExecutions(@Query() query: ReportExecutionQueryDto, @CurrentTenant() tenantId: string) {
    return this.reportingService.listExecutions(tenantId, query);
  }

  @Get('executions/:id')
  @RequirePermissions(REPORT_PERMISSIONS.VIEW_EXECUTION)
  getExecution(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.reportingService.getExecution(id, tenantId);
  }

  @Get('executions/:id/download')
  @RequirePermissions(REPORT_PERMISSIONS.DOWNLOAD)
  async getDownloadUrl(@Param('id') id: string, @CurrentTenant() tenantId: string, @CurrentUser() userId: string | undefined) {
    const downloadUrl = await this.reportingService.getDownloadUrl(id, tenantId, userId);
    return { downloadUrl };
  }

  // ---------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------

  @Post('templates')
  @RequirePermissions(REPORT_PERMISSIONS.TEMPLATE_MANAGE)
  createTemplate(@Body() dto: CreateReportTemplateDto, @CurrentTenant() tenantId: string, @CurrentUser() userId: string | undefined) {
    return this.templateService.create(tenantId, userId, dto);
  }

  @Get('templates')
  @RequirePermissions(REPORT_PERMISSIONS.TEMPLATE_VIEW)
  listTemplates(@CurrentTenant() tenantId: string, @Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.templateService.list(tenantId, page, pageSize);
  }

  @Get('templates/:id')
  @RequirePermissions(REPORT_PERMISSIONS.TEMPLATE_VIEW)
  getTemplate(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.templateService.findById(id, tenantId);
  }

  @Patch('templates/:id')
  @RequirePermissions(REPORT_PERMISSIONS.TEMPLATE_MANAGE)
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateReportTemplateDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string | undefined,
  ) {
    return this.templateService.update(id, tenantId, userId, dto);
  }

  @Delete('templates/:id')
  @RequirePermissions(REPORT_PERMISSIONS.TEMPLATE_MANAGE)
  removeTemplate(@Param('id') id: string, @CurrentTenant() tenantId: string, @CurrentUser() userId: string | undefined) {
    return this.templateService.remove(id, tenantId, userId);
  }

  // ---------------------------------------------------------------
  // Scheduled reports
  // ---------------------------------------------------------------

  @Post('schedules')
  @RequirePermissions(REPORT_PERMISSIONS.SCHEDULE_MANAGE)
  createSchedule(@Body() dto: CreateScheduledReportDto, @CurrentTenant() tenantId: string, @CurrentUser() userId: string | undefined) {
    return this.scheduledReportService.create(tenantId, userId, dto);
  }

  @Get('schedules')
  @RequirePermissions(REPORT_PERMISSIONS.SCHEDULE_VIEW)
  listSchedules(@CurrentTenant() tenantId: string, @Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.scheduledReportService.list(tenantId, page, pageSize);
  }

  @Get('schedules/:id')
  @RequirePermissions(REPORT_PERMISSIONS.SCHEDULE_VIEW)
  getSchedule(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.scheduledReportService.findById(id, tenantId);
  }

  @Patch('schedules/:id')
  @RequirePermissions(REPORT_PERMISSIONS.SCHEDULE_MANAGE)
  updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdateScheduledReportDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string | undefined,
  ) {
    return this.scheduledReportService.update(id, tenantId, userId, dto);
  }

  @Delete('schedules/:id')
  @RequirePermissions(REPORT_PERMISSIONS.SCHEDULE_MANAGE)
  removeSchedule(@Param('id') id: string, @CurrentTenant() tenantId: string, @CurrentUser() userId: string | undefined) {
    return this.scheduledReportService.remove(id, tenantId, userId);
  }

  @Post('schedules/:id/run-now')
  @RequirePermissions(REPORT_PERMISSIONS.SCHEDULE_MANAGE)
  async runScheduleNow(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    const executionId = await this.scheduledReportService.runNow(id, tenantId);
    return { executionId };
  }
}
