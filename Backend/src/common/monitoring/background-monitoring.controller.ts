/**
 * background-monitoring.controller.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 */

import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProtectedEndpoint } from '../decorators/authorization.decorators';
import { QueueMonitorService } from './queue-monitor.service';

@ApiTags('Background Jobs — Monitoring')
@Controller('admin/background-jobs')
export class BackgroundMonitoringController {
  constructor(private readonly monitor: QueueMonitorService) {}

  @Get('stats')
  @ProtectedEndpoint('background-jobs:read')
  @ApiOperation({ summary: 'Queue statistics for every registered queue (counts, paused state, worker stats).' })
  getAllStats() {
    return this.monitor.getAllQueueStats();
  }

  @Get(':queueName/stats')
  @ProtectedEndpoint('background-jobs:read')
  @ApiOperation({ summary: 'Queue statistics for one queue.' })
  getQueueStats(@Param('queueName') queueName: string) {
    return this.monitor.getQueueStats(queueName);
  }

  @Get(':queueName/jobs/active')
  @ProtectedEndpoint('background-jobs:read')
  getActive(
    @Param('queueName') queueName: string,
    @Query('start', new ParseIntPipe({ optional: true })) start?: number,
    @Query('end', new ParseIntPipe({ optional: true })) end?: number,
  ) {
    return this.monitor.getActiveJobs(queueName, start, end);
  }

  @Get(':queueName/jobs/completed')
  @ProtectedEndpoint('background-jobs:read')
  getCompleted(
    @Param('queueName') queueName: string,
    @Query('start', new ParseIntPipe({ optional: true })) start?: number,
    @Query('end', new ParseIntPipe({ optional: true })) end?: number,
  ) {
    return this.monitor.getCompletedJobs(queueName, start, end);
  }

  @Get(':queueName/jobs/failed')
  @ProtectedEndpoint('background-jobs:read')
  getFailed(
    @Param('queueName') queueName: string,
    @Query('start', new ParseIntPipe({ optional: true })) start?: number,
    @Query('end', new ParseIntPipe({ optional: true })) end?: number,
  ) {
    return this.monitor.getFailedJobs(queueName, start, end);
  }

  @Get(':queueName/jobs/scheduled')
  @ProtectedEndpoint('background-jobs:read')
  getScheduled(
    @Param('queueName') queueName: string,
    @Query('start', new ParseIntPipe({ optional: true })) start?: number,
    @Query('end', new ParseIntPipe({ optional: true })) end?: number,
  ) {
    return this.monitor.getScheduledJobs(queueName, start, end);
  }
}
