/**
 * background.module.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * Aggregates every piece of this framework into one importable module.
 * Registered once in app.module.ts (see IMPLEMENTATION_SUMMARY_B2_9.md for
 * the exact diff) alongside — not instead of — the existing
 * infrastructure/jobs/JobModule and infrastructure/scheduler/SchedulerModule
 * (RabbitMQ-based), which remain unchanged.
 *
 * Business modules (B3+) that want to process jobs typically only need:
 *   - inject `QueueService` to enqueue
 *   - inject `IJobScheduler` (JOB_SCHEDULER token) to schedule
 *   - extend `JobProcessorBase`/`BatchJobProcessor`/`WorkflowJobProcessor`
 *     for their processor, then call `WorkerRegistryService.registerAndStart()`
 *     once (typically in their module's constructor or an onModuleInit)
 * without needing to import anything from providers/ or workers/ directly.
 */

import { Global, Module } from '@nestjs/common';
import { QueueProviderModule } from './providers/queue-provider.module';
import { AppLoggerModule } from './logger/app-logger.module';
import { GenericServiceLayerModule } from './generic-service-layer.module';
import { EventModule } from '../infrastructure/events/event.module';
import { SchedulerModule as ExistingSchedulerModule } from '../infrastructure/scheduler/scheduler.module';

import { QueueService } from './queues/queue.service';
import { QueueRegistryService } from './queues/queue-registry.service';
import { DeadLetterQueueService } from './queues/dead-letter-queue.service';
import { BackgroundAdminController } from './queues/background-admin.controller';

import { JobProcessorRegistry } from './jobs/job-processor.registry';
import { EventJobBridgeService } from './jobs/event-job-bridge.service';

import { WorkerRegistryService } from './workers/worker-registry.service';

import { BackgroundJobScheduler } from './scheduler/background-job-scheduler.service';
import { JOB_SCHEDULER, QUEUE_MONITOR } from './interfaces/background/tokens';
import { EVENT_BUS } from './interfaces/background/event-bus.interface';
import { BACKGROUND_JOB_SERVICE } from './interfaces/background/background-job-service.interface';
import { RabbitMqEventBusAdapter } from './providers/rabbitmq-event-bus.adapter';
import { BullMqBackgroundJobAdapter } from './providers/bullmq-background-job.adapter';

import { RetryTrackerService } from './retry/retry-tracker.service';

import { QueueMonitorService } from './monitoring/queue-monitor.service';
import { BackgroundMonitoringController } from './monitoring/background-monitoring.controller';
import { QueueDashboardMetadataService } from './monitoring/queue-dashboard-metadata.service';

@Global()
@Module({
  imports: [
    QueueProviderModule,
    AppLoggerModule,
    EventModule,
    GenericServiceLayerModule,
    // Reused, not duplicated: BackgroundJobScheduler delegates cron/interval
    // timer machinery to this module's CronService/TaskScheduler.
    ExistingSchedulerModule,
  ],
  controllers: [BackgroundAdminController, BackgroundMonitoringController],
  providers: [
    QueueService,
    QueueRegistryService,
    DeadLetterQueueService,
    JobProcessorRegistry,
    EventJobBridgeService,
    WorkerRegistryService,
    RetryTrackerService,
    QueueDashboardMetadataService,
    { provide: JOB_SCHEDULER, useClass: BackgroundJobScheduler },
    { provide: QUEUE_MONITOR, useClass: QueueMonitorService },
    { provide: EVENT_BUS, useClass: RabbitMqEventBusAdapter },
    { provide: BACKGROUND_JOB_SERVICE, useClass: BullMqBackgroundJobAdapter },
    QueueMonitorService,
  ],
  exports: [
    QueueService,
    QueueRegistryService,
    DeadLetterQueueService,
    JobProcessorRegistry,
    EventJobBridgeService,
    WorkerRegistryService,
    RetryTrackerService,
    QueueDashboardMetadataService,
    JOB_SCHEDULER,
    QUEUE_MONITOR,
    EVENT_BUS,
    BACKGROUND_JOB_SERVICE,
  ],
})
export class BackgroundJobsModule {}
