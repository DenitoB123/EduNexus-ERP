import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ScheduledTaskRegistry } from './scheduled-task-registry.service';
import { SchedulerUtils } from './scheduler.utils';
import { AppLoggerService } from '../../common/logger/app-logger.service';

@Injectable()
export class CronService {
  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly taskRegistry: ScheduledTaskRegistry,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('CronService');
  }

  addCron(name: string, cronExpression: string, onTick: () => void | Promise<void>): void {
    if (!SchedulerUtils.isValidCronExpression(cronExpression)) {
      throw new Error(`Invalid cron expression "${cronExpression}" for task "${name}"`);
    }

    if (this.schedulerRegistry.doesExist('cron', name)) {
      this.removeCron(name);
    }

    const job = new CronJob(cronExpression, () => {
      void onTick();
    });

    this.schedulerRegistry.addCronJob(name, job);
    job.start();

    this.taskRegistry.register({
      name,
      type: 'cron',
      expression: cronExpression,
      registeredAt: new Date(),
    });

    this.logger.log(`Registered cron task "${name}" with expression "${cronExpression}"`);
  }

  removeCron(name: string): void {
    if (this.schedulerRegistry.doesExist('cron', name)) {
      this.schedulerRegistry.deleteCronJob(name);
      this.taskRegistry.unregister(name);
      this.logger.log(`Removed cron task "${name}"`);
    }
  }

  listCronTasks(): string[] {
    return [...this.schedulerRegistry.getCronJobs().keys()];
  }
}
