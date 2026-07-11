/**
 * queue-monitor.service.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 */

import { Injectable } from '@nestjs/common';
import { QueueService } from '../queues/queue.service';
import { QueueRegistryService } from '../queues/queue-registry.service';
import { WorkerRegistryService } from '../workers/worker-registry.service';
import { IQueueMonitor, IQueueStatsSnapshot } from '../interfaces/background/monitoring.interface';
import { IQueueProviderJob } from '../interfaces/background/queue-provider.interface';

@Injectable()
export class QueueMonitorService implements IQueueMonitor {
  constructor(
    private readonly queueService: QueueService,
    private readonly queueRegistry: QueueRegistryService,
    private readonly workerRegistry: WorkerRegistryService,
  ) {}

  async getQueueStats(queueName: string): Promise<IQueueStatsSnapshot> {
    const [counts, paused] = await Promise.all([
      this.queueService.getCounts(queueName),
      this.queueService.isQueuePaused(queueName),
    ]);

    return {
      queueName,
      counts,
      paused,
      workers: this.workerRegistry.getAllStats().filter((w) => w.queueName === queueName),
    };
  }

  async getAllQueueStats(): Promise<IQueueStatsSnapshot[]> {
    return Promise.all(this.queueRegistry.list().map((name) => this.getQueueStats(name)));
  }

  getActiveJobs(queueName: string, start = 0, end = 99): Promise<IQueueProviderJob[]> {
    return this.queueService.getJobs(queueName, ['active'], start, end);
  }

  getCompletedJobs(queueName: string, start = 0, end = 99): Promise<IQueueProviderJob[]> {
    return this.queueService.getJobs(queueName, ['completed'], start, end);
  }

  getFailedJobs(queueName: string, start = 0, end = 99): Promise<IQueueProviderJob[]> {
    return this.queueService.getJobs(queueName, ['failed'], start, end);
  }

  getScheduledJobs(queueName: string, start = 0, end = 99): Promise<IQueueProviderJob[]> {
    return this.queueService.getJobs(queueName, ['delayed'], start, end);
  }
}
