import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { CleanupTasks } from './tasks/cleanup.tasks';
import { EventBusModule } from '../event-bus/event-bus.module';
import { CacheModule } from '../cache/cache.module';

// ─────────────────────────────────────────────────────────────────────────────
// SchedulerModule — Milestone 1.7
//
// New dependency: @nestjs/schedule (added to package.additions.json).
// Wraps it with distributed locking (Redis) + run history (ScheduledTaskRun)
// so cron jobs are safe to run on multiple replicas and are observable
// rather than fire-and-forget into the void.
//
// Add new recurring jobs as their own Task class in ./tasks and register it
// in `providers` here — do not add ad-hoc @Cron methods elsewhere in the
// codebase, so all scheduled work stays discoverable from one place.
// ─────────────────────────────────────────────────────────────────────────────
@Module({
  imports: [ScheduleModule.forRoot(), EventBusModule, CacheModule],
  providers: [SchedulerService, CleanupTasks],
  controllers: [SchedulerController],
  exports: [SchedulerService],
})
export class SchedulerModule {}
