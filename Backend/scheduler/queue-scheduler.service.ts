import { Injectable } from '@nestjs/common';
import { CronService } from './cron.service';
import { JobQueueService } from '../jobs/job-queue.service';

@Injectable()
export class QueueScheduler {
  constructor(
    private readonly cronService: CronService,
    private readonly jobQueueService: JobQueueService,
  ) {}

  scheduleRecurringJob<T>(taskName: string, cronExpression: string, jobName: string, data: T): void {
    this.cronService.addCron(taskName, cronExpression, async () => {
      await this.jobQueueService.enqueue(jobName, data);
    });
  }

  unschedule(taskName: string): void {
    this.cronService.removeCron(taskName);
  }
}
