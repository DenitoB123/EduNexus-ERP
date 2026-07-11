import { Injectable } from '@nestjs/common';

export interface ScheduledTaskInfo {
  name: string;
  type: 'cron' | 'interval' | 'timeout';
  expression: string;
  registeredAt: Date;
}

@Injectable()
export class ScheduledTaskRegistry {
  private readonly tasks = new Map<string, ScheduledTaskInfo>();

  register(info: ScheduledTaskInfo): void {
    this.tasks.set(info.name, info);
  }

  unregister(name: string): void {
    this.tasks.delete(name);
  }

  list(): ScheduledTaskInfo[] {
    return Array.from(this.tasks.values());
  }

  get(name: string): ScheduledTaskInfo | undefined {
    return this.tasks.get(name);
  }
}
