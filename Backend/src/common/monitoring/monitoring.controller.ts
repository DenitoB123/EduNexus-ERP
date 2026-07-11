import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../decorators/require-access.decorator';
import { MonitoringService } from './monitoring.service';
import { HealthAggregatorService } from '../health/health-aggregator.service';
import { TracerService } from '../tracing/tracer.service';
import { HealthCheckCategory } from '../health/interfaces/health-checker.interface';

/**
 * New surface distinct from the existing /health/* routes in
 * src/health/health.controller.ts (which stay as the
 * orchestrator-facing terminus probes). /observability/* is the
 * dashboard-facing surface this milestone adds: full snapshots,
 * per-checker detail, diagnostics, alerts, and trace inspection.
 *
 * Guarded the same way B2.10's NotificationController is (RolesGuard
 * + PermissionsGuard; JwtAuthGuard already applies globally via
 * APP_GUARD in app.module.ts) — both guards currently log-and-allow
 * pending the Auth module, per their own documented behavior, so
 * these routes are inert-safe today.
 */
@ApiTags('Observability')
@Controller('observability')
@UseGuards(RolesGuard, PermissionsGuard)
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly healthAggregatorService: HealthAggregatorService,
    private readonly tracerService: TracerService,
  ) {}

  @Get('dashboard')
  @RequirePermissions('observability:read')
  @ApiOperation({ summary: 'Full dashboard snapshot', description: 'Health, metrics, recent alerts, and recent trace spans in one payload.' })
  getDashboard() {
    return this.monitoringService.getDashboardSnapshot();
  }

  @Get('health')
  @RequirePermissions('observability:read')
  @ApiOperation({ summary: 'Aggregate health report', description: 'Query with ?category=liveness|readiness|startup|dependency (default readiness).' })
  getHealth(@Query('category') category?: HealthCheckCategory) {
    return this.healthAggregatorService.checkCategory(category ?? 'readiness');
  }

  @Get('health/:name')
  @RequirePermissions('observability:read')
  @ApiOperation({ summary: 'Single health checker result' })
  getHealthChecker(@Param('name') name: string) {
    return this.healthAggregatorService.checkOne(name);
  }

  @Get('metrics')
  @RequirePermissions('observability:read')
  @ApiOperation({ summary: 'Full metrics snapshot', description: 'Request count, response time, error rate, DB/queue/cache/event-bus/security metrics, memory, CPU, active connections.' })
  getMetrics() {
    return this.monitoringService.getMetrics();
  }

  @Get('diagnostics')
  @RequirePermissions('observability:manage')
  @ApiOperation({ summary: 'Full diagnostics report', description: 'Recent exceptions, dependency/config/module/performance diagnostics.' })
  getDiagnostics() {
    return this.monitoringService.getDiagnostics();
  }

  @Get('alerts')
  @RequirePermissions('observability:read')
  @ApiOperation({ summary: 'Recent alerts', description: 'Alerts fired by the background evaluation cron in the last process lifetime (in-memory, not persisted).' })
  getAlerts() {
    return this.monitoringService.getRecentAlerts();
  }

  @Get('traces')
  @RequirePermissions('observability:read')
  @ApiOperation({ summary: 'Recent trace spans', description: 'Query with ?traceId=... to filter to a single request/workflow trace.' })
  getTraces(@Query('traceId') traceId?: string) {
    return this.tracerService.getRecentSpans(traceId);
  }
}
