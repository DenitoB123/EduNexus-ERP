/**
 * background-worker.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * Binds one IJobProcessor to one queue at a given concurrency (the
 * "worker pool" — see IWorkerPoolOptions doc comment). Not itself a Nest
 * provider — WorkerRegistryService creates and owns instances, since the
 * number of workers is dynamic (one per registered processor), not fixed
 * at compile time the way a single `@Injectable()` class implies.
 */

import { AppLoggerService } from '../logger/app-logger.service';
import { IBackgroundWorker, IWorkerPoolOptions, IWorkerStats } from '../interfaces/background/worker.interface';
import { IJobProcessor, IBackgroundJobEnvelope } from '../interfaces/background/job.interface';
import { IQueueProviderJob, IQueueWorkerHandle } from '../interfaces/background/queue-provider.interface';
import { QueueService } from '../queues/queue.service';
import { WorkerRegistrationUtil } from '../utils/background/worker-registration.util';

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30_000;

export class BackgroundWorker implements IBackgroundWorker {
  private handle?: IQueueWorkerHandle;
  private jobsProcessed = 0;
  private jobsFailed = 0;
  private startedAt = new Date();

  constructor(
    public readonly queueName: string,
    private readonly processor: IJobProcessor,
    private readonly options: IWorkerPoolOptions,
    private readonly queueService: QueueService,
    private readonly logger: AppLoggerService,
  ) {}

  async start(): Promise<void> {
    WorkerRegistrationUtil.assertNotAlreadyRegistered(this.queueName);

    this.handle = this.queueService
      .getProvider()
      .forQueue(this.queueName)
      .registerProcessor(async (job: IQueueProviderJob) => {
        const envelope = job.payload as IBackgroundJobEnvelope;
        const reportProgress = async (_pct: number) => {
          /* BullMQ progress reporting is wired at the Job level inside the
             provider; this framework exposes it to processors via the
             callback passed to IJobProcessor.handle for interface parity
             across future engines that may not support progress at all. */
        };

        try {
          const result = await this.processor.handle(envelope, reportProgress);
          this.jobsProcessed += 1;
          return result;
        } catch (error) {
          this.jobsFailed += 1;
          throw error;
        }
      }, this.options.concurrency);

    this.startedAt = new Date();
    this.logger.log(
      `Worker started for queue "${this.queueName}" (processor "${this.processor.jobName}", concurrency ${this.options.concurrency})`,
    );
  }

  async stop(): Promise<void> {
    if (!this.handle) return;

    const timeoutMs = this.options.gracefulShutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
    this.logger.log(`Stopping worker for queue "${this.queueName}" (grace period ${timeoutMs}ms)...`);

    await Promise.race([
      this.handle.close(),
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);

    this.logger.log(`Worker for queue "${this.queueName}" stopped`);
  }

  getStats(): IWorkerStats {
    return {
      queueName: this.queueName,
      concurrency: this.options.concurrency,
      running: this.handle?.isRunning() ?? false,
      jobsProcessed: this.jobsProcessed,
      jobsFailed: this.jobsFailed,
      startedAt: this.startedAt,
    };
  }
}
