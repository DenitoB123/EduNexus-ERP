import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduledTaskRegistry } from './scheduled-task-registry.service';
import { CronService } from './cron.service';
import { TaskScheduler } from './task-scheduler.service';
import { QueueScheduler } from './queue-scheduler.service';
import { JobModule } from '../jobs/job.module';

@Global()
@Module({
  imports: [ScheduleModule.forRoot(), JobModule],
  providers: [ScheduledTaskRegistry, CronService, TaskScheduler, QueueScheduler],
  exports: [ScheduledTaskRegistry, CronService, TaskScheduler, QueueScheduler],
})
export class SchedulerModule {}
