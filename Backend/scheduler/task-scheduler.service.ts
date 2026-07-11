import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ScheduledTaskRegistry } from './scheduled-task-registry.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';

@Injectable()
export class TaskScheduler {
  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly taskRegistry: ScheduledTaskRegistry,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('TaskScheduler');
  }

  addInterval(name: string, intervalMs: number, callback: () => void | Promise<void>): void {
    if (this.schedulerRegistry.doesExist('interval', name)) {
      this.removeInterval(name);
    }

    const handle = setInterval(() => void callback(), intervalMs);
    this.schedulerRegistry.addInterval(name, handle);

    this.taskRegistry.register({
      name,
      type: 'interval',
      expression: `every ${intervalMs}ms`,
      registeredAt: new Date(),
    });
  }

  removeInterval(name: string): void {
    if (this.schedulerRegistry.doesExist('interval', name)) {
      this.schedulerRegistry.deleteInterval(name);
      this.taskRegistry.unregister(name);
    }
  }

  addTimeout(name: string, delayMs: number, callback: () => void | Promise<void>): void {
    if (this.schedulerRegistry.doesExist('timeout', name)) {
      this.removeTimeout(name);
    }

    const handle = setTimeout(() => {
      void callback();
      this.taskRegistry.unregister(name);
    }, delayMs);

    this.schedulerRegistry.addTimeout(name, handle);

    this.taskRegistry.register({
      name,
      type: 'timeout',
      expression: `in ${delayMs}ms`,
      registeredAt: new Date(),
    });
  }

  removeTimeout(name: string): void {
    if (this.schedulerRegistry.doesExist('timeout', name)) {
      this.schedulerRegistry.deleteTimeout(name);
      this.taskRegistry.unregister(name);
    }
  }
}
