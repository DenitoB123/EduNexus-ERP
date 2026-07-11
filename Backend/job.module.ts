import { Global, Module } from '@nestjs/common';
import { JobRegistry } from './job-registry.service';
import { JobQueueService } from './job-queue.service';
import { DelayedJobsService } from './delayed-jobs.service';
import { ScheduledJobsService } from './scheduled-jobs.service';
import { RetryJobsService } from './retry-jobs.service';
import { FailedJobRecoveryService } from './failed-job-recovery.service';
import { QueueMonitoringService } from './queue-monitoring.service';
import { WorkerManagerService } from './worker-manager.service';

@Global()
@Module({
  providers: [
    JobRegistry,
    JobQueueService,
    DelayedJobsService,
    ScheduledJobsService,
    RetryJobsService,
    FailedJobRecoveryService,
    QueueMonitoringService,
    WorkerManagerService,
  ],
  exports: [
    JobRegistry,
    JobQueueService,
    DelayedJobsService,
    ScheduledJobsService,
    RetryJobsService,
    FailedJobRecoveryService,
    QueueMonitoringService,
  ],
})
export class JobModule {}
