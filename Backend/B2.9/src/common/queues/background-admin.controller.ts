/**
 * background-admin.controller.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * Queue administration surface: pause/resume/purge/cancel/retry/requeue.
 * Guarded by B2.4's `@ProtectedEndpoint()` (AuthorizationGuard +
 * `@Permissions()`, resolved through B2.3's PERMISSION_CHECKER token) —
 * the same flat-permission-string pattern used elsewhere, appropriate
 * here since these are operational actions on a queue, not
 * resource-owned entities that would need B2.7's resource-aware
 * PermissionGuard/policy engine.
 *
 * Every action is also audit-logged via APP_LOGGER (B2.3), since queue
 * admin actions are exactly the kind of operational action later
 * consolidation milestones will want in the audit trail.
 */

import { Body, Controller, Delete, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProtectedEndpoint } from '../decorators/authorization.decorators';
import { CurrentActor } from '../decorators/current-context.decorator';
import { APP_LOGGER } from '../interfaces/tokens';
import { IAppLogger } from '../interfaces/infrastructure.interfaces';
import { QueueService } from './queue.service';
import { DeadLetterQueueService } from './dead-letter-queue.service';

@ApiTags('Background Jobs — Administration')
@Controller('admin/background-jobs/queues')
export class BackgroundAdminController {
  constructor(
    private readonly queueService: QueueService,
    private readonly deadLetterQueueService: DeadLetterQueueService,
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
  ) {}

  @Post(':queueName/pause')
  @ProtectedEndpoint('background-jobs:admin')
  @ApiOperation({ summary: 'Pause a queue — no new jobs are processed until resumed.' })
  async pause(@Param('queueName') queueName: string, @CurrentActor() actor: { userId: string } | undefined) {
    await this.queueService.pauseQueue(queueName);
    this.logger.log(`Queue "${queueName}" paused`, 'BackgroundAdminController', { actorId: actor?.userId });
    return { queueName, paused: true };
  }

  @Post(':queueName/resume')
  @ProtectedEndpoint('background-jobs:admin')
  @ApiOperation({ summary: 'Resume a paused queue.' })
  async resume(@Param('queueName') queueName: string, @CurrentActor() actor: { userId: string } | undefined) {
    await this.queueService.resumeQueue(queueName);
    this.logger.log(`Queue "${queueName}" resumed`, 'BackgroundAdminController', { actorId: actor?.userId });
    return { queueName, paused: false };
  }

  @Delete(':queueName/purge')
  @ProtectedEndpoint('background-jobs:admin')
  @ApiOperation({ summary: 'Permanently remove completed/failed/all jobs from a queue.' })
  async purge(
    @Param('queueName') queueName: string,
    @Query('status') status: 'completed' | 'failed' | 'all' = 'all',
    @CurrentActor() actor: { userId: string } | undefined,
  ) {
    const purged = await this.queueService.purgeQueue(queueName, status);
    this.logger.warn(`Queue "${queueName}" purged (${status}): ${purged} job(s) removed`, 'BackgroundAdminController', {
      actorId: actor?.userId,
    });
    return { queueName, status, purged };
  }

  @Delete(':queueName/jobs/:jobId')
  @ProtectedEndpoint('background-jobs:admin')
  @ApiOperation({ summary: 'Cancel a single pending/delayed job.' })
  async cancelJob(@Param('queueName') queueName: string, @Param('jobId') jobId: string) {
    const cancelled = await this.queueService.cancelJob(queueName, jobId);
    return { queueName, jobId, cancelled };
  }

  @Post(':queueName/jobs/:jobId/retry')
  @ProtectedEndpoint('background-jobs:admin')
  @ApiOperation({ summary: 'Manually retry a specific failed job.' })
  async retryJob(@Param('queueName') queueName: string, @Param('jobId') jobId: string) {
    const retried = await this.queueService.retryJob(queueName, jobId);
    return { queueName, jobId, retried };
  }

  @Post(':queueName/failed/replay')
  @ProtectedEndpoint('background-jobs:admin')
  @ApiOperation({ summary: 'Replay up to `limit` failed jobs as fresh jobs (dead-letter recovery).' })
  async replayFailed(@Param('queueName') queueName: string, @Body('limit') limit?: number) {
    const replayed = await this.deadLetterQueueService.replayFailed(queueName, limit ?? 50);
    return { queueName, replayed };
  }
}
