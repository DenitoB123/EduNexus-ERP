export interface JobPayload<T = unknown> {
  jobId: string;
  name: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  scheduledFor?: Date;
}

export interface IJobHandler<T = unknown> {
  readonly name: string;
  process(payload: JobPayload<T>): Promise<void>;
}

export type JobStatus = 'pending' | 'active' | 'completed' | 'failed' | 'delayed';
