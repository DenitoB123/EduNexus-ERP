import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { PrismaHealthIndicator } from './indicators/prisma-health.indicator';
import { RedisHealthIndicator } from './indicators/redis-health.indicator';
import { RabbitMQHealthIndicator } from './indicators/rabbitmq-health.indicator';
import { DatabaseHealthService } from '../database/services/database-health.service';
import { QueueHealthIndicator } from '../infrastructure/monitoring/queue-health.indicator';
import { StorageHealthIndicator } from '../infrastructure/monitoring/storage-health.indicator';
import { InfrastructureMetricsService } from '../infrastructure/monitoring/infrastructure-metrics.service';
import { PerformanceMonitoringService } from '../infrastructure/monitoring/performance-monitoring.service';
import { SecurityHealthIndicator } from '../security/monitoring/security-health.indicator';
import { SecurityMetrics } from '../security/monitoring/security-metrics.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly prismaHealthIndicator: PrismaHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator,
    private readonly rabbitMQHealthIndicator: RabbitMQHealthIndicator,
    private readonly databaseHealthService: DatabaseHealthService,
    private readonly queueHealthIndicator: QueueHealthIndicator,
    private readonly storageHealthIndicator: StorageHealthIndicator,
    private readonly infrastructureMetricsService: InfrastructureMetricsService,
    private readonly performanceMonitoringService: PerformanceMonitoringService,
    private readonly securityHealthIndicator: SecurityHealthIndicator,
    private readonly securityMetrics: SecurityMetrics,
  ) {}

  @Public()
  @Get('live')
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Indicates whether the application process is running and responsive.',
  })
  checkLiveness() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
    ]);
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Indicates whether the application and all critical downstream dependencies (PostgreSQL, Redis, RabbitMQ, storage) are ready to serve traffic.',
  })
  checkReadiness() {
    return this.health.check([
      () => this.prismaHealthIndicator.check('database'),
      () => this.redisHealthIndicator.check('redis'),
      () => this.rabbitMQHealthIndicator.check('rabbitmq'),
      () => this.queueHealthIndicator.check('queue'),
      () => this.storageHealthIndicator.check('storage'),
      () => this.disk.checkStorage('disk', { thresholdPercent: 0.9, path: '/' }),
      () => Promise.resolve(this.securityHealthIndicator.check('security')),
    ]);
  }

  @Public()
  @Get('database')
  @ApiOperation({
    summary: 'Database metrics snapshot',
    description: 'Returns connection state and query performance metrics for the database layer.',
  })
  getDatabaseSnapshot() {
    return this.databaseHealthService.getSnapshot();
  }

  @Public()
  @Get('infrastructure')
  @ApiOperation({
    summary: 'Infrastructure metrics snapshot',
    description: 'Returns aggregated database and background-job metrics.',
  })
  getInfrastructureSnapshot() {
    return this.infrastructureMetricsService.getSnapshot();
  }

  @Public()
  @Get('performance')
  @ApiOperation({
    summary: 'API performance snapshot',
    description: 'Returns per-endpoint request counts and timing statistics.',
  })
  getPerformanceSnapshot() {
    return this.performanceMonitoringService.getSnapshot();
  }

  @Public()
  @Get('security')
  @ApiOperation({
    summary: 'Security metrics snapshot',
    description: 'Returns security event counters (rate limit hits, suspicious payload detections, etc.).',
  })
  getSecuritySnapshot() {
    return this.securityMetrics.getSnapshot();
  }
}
