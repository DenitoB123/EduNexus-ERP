/**
 * job-processor.registry.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 */

import { Injectable } from '@nestjs/common';
import { IJobProcessor } from '../interfaces/background/job.interface';

@Injectable()
export class JobProcessorRegistry {
  private readonly processors = new Map<string, IJobProcessor>();

  register(processor: IJobProcessor): void {
    if (this.processors.has(processor.jobName)) {
      throw new Error(`A job processor is already registered for job name "${processor.jobName}".`);
    }
    this.processors.set(processor.jobName, processor);
  }

  get(jobName: string): IJobProcessor | undefined {
    return this.processors.get(jobName);
  }

  list(): IJobProcessor[] {
    return [...this.processors.values()];
  }
}
