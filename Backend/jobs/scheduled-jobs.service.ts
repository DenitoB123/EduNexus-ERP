import { Injectable } from '@nestjs/common';
import { DelayedJobsService } from './delayed-jobs.service';

@Injectable()
export class ScheduledJobsService {
  constructor(private readonly delayedJobsService: DelayedJobsService) {}

  async scheduleAt<T>(name: string, data: T, runAt: Date): Promise<string> {
    const delayMs = Math.max(0, runAt.getTime() - Date.now());
    return this.delayedJobsService.enqueueDelayed(name, data, delayMs);
  }
}
