/**
 * job.interface.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 */

import { JobPriority } from './queue-provider.interface';

export enum BackgroundJobType {
  FIRE_AND_FORGET = 'fire_and_forget',
  RETRYABLE = 'retryable',
  LONG_RUNNING = 'long_running',
  BATCH = 'batch',
  WORKFLOW = 'workflow',
  EVENT_DRIVEN = 'event_driven',
}

export type BackgroundJobStatus = 'waiting' | 'delayed' | 'active' | 'completed' | 'failed' | 'paused';

export interface IJobContext {
  tenantId?: string;
  actorId?: string;
  correlationId?: string;
}

export interface IBackgroundJobEnvelope<TPayload = unknown> {
  jobType: BackgroundJobType;
  context: IJobContext;
  payload: TPayload;
  /** Set by BatchJobProcessor when the payload represents one chunk of a larger batch. */
  batch?: { batchId: string; chunkIndex: number; totalChunks: number };
  /** Set by WorkflowJobProcessor to identify which step of a workflow this job executes. */
  workflow?: { workflowId: string; stepName: string; correlatesWithEventName?: string };
}

/**
 * Implemented by every concrete job processor and registered against a
 * queue via QueueService.registerProcessor(). Kept deliberately small —
 * cross-cutting concerns (logging, audit, retry bookkeeping, event
 * publication) live in JobProcessorBase, not in this contract, so a
 * processor only has to implement `handle()`.
 */
export interface IJobProcessor<TPayload = unknown, TResult = unknown> {
  readonly jobName: string;
  readonly jobType: BackgroundJobType;
  handle(envelope: IBackgroundJobEnvelope<TPayload>, reportProgress: (pct: number) => Promise<void>): Promise<TResult>;
}

export interface IEnqueueJobOptions {
  priority?: JobPriority;
  delayMs?: number;
  attempts?: number;
  context?: IJobContext;
}
