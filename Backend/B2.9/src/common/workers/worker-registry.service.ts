/**
 * worker-registry.service.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * Creates and owns every BackgroundWorker instance. Implements
 * OnApplicationShutdown so every worker gets a chance to finish its
 * in-flight jobs (up to each worker's gracefulShutdownTimeoutMs) before
 * the process exits — Nest calls this hook on SIGTERM/SIGINT when
 * `app.enableShutdownHooks()` is enabled in main.ts.
 */

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { AppLoggerService } from '../logger/app-logger.service';
import { BackgroundWorker } from './background-worker';
import { IJobProcessor } from '../interfaces/background/job.interface';
import { IWorkerPoolOptions, IWorkerStats } from '../interfaces/background/worker.interface';
import { QueueService } from '../queues/queue.service';
import { JobProcessorRegistry } from '../jobs/job-processor.registry';

@Injectable()
export class WorkerRegistryService implements OnApplicationShutdown {
  private readonly workers: BackgroundWorker[] = [];

  constructor(
    private readonly queueService: QueueService,
    private readonly processorRegistry: JobProcessorRegistry,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('WorkerRegistryService');
  }

  /** Registers `processor` in JobProcessorRegistry and starts a BackgroundWorker consuming `queueName` for it. */
  async registerAndStart(
    queueName: string,
    processor: IJobProcessor,
    options: IWorkerPoolOptions,
  ): Promise<BackgroundWorker> {
    this.processorRegistry.register(processor);

    const worker = new BackgroundWorker(queueName, processor, options, this.queueService, this.logger);
    await worker.start();
    this.workers.push(worker);
    return worker;
  }

  getAllStats(): IWorkerStats[] {
    return this.workers.map((w) => w.getStats());
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`Application shutdown (${signal ?? 'unknown signal'}) — stopping ${this.workers.length} background worker(s)...`);
    await Promise.all(this.workers.map((w) => w.stop()));
  }
}
