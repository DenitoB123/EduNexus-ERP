/**
 * monitoring.interface.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 */

import { IQueueCounts, IQueueProviderJob } from './queue-provider.interface';
import { IWorkerStats } from './worker.interface';

export interface IQueueStatsSnapshot {
  queueName: string;
  counts: IQueueCounts;
  paused: boolean;
  workers: IWorkerStats[];
}

export interface IQueueMonitor {
  getQueueStats(queueName: string): Promise<IQueueStatsSnapshot>;
  getAllQueueStats(): Promise<IQueueStatsSnapshot[]>;
  getActiveJobs(queueName: string, start?: number, end?: number): Promise<IQueueProviderJob[]>;
  getCompletedJobs(queueName: string, start?: number, end?: number): Promise<IQueueProviderJob[]>;
  getFailedJobs(queueName: string, start?: number, end?: number): Promise<IQueueProviderJob[]>;
  getScheduledJobs(queueName: string, start?: number, end?: number): Promise<IQueueProviderJob[]>;
}
