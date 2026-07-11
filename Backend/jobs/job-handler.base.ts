import { IJobHandler, JobPayload } from '../interfaces/job.interface';

export abstract class JobHandlerBase<T = unknown> implements IJobHandler<T> {
  abstract readonly name: string;
  abstract process(payload: JobPayload<T>): Promise<void>;
}
