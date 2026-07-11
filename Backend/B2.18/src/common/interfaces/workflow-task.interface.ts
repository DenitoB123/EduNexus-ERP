/**
 * workflow-task.interface.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 */

export enum WorkflowTaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  ESCALATED = 'ESCALATED',
  DELEGATED = 'DELEGATED',
}

export interface IWorkflowTask {
  id: string;
  tenantId: string;
  instanceId: string;
  stepId: string;
  name: string;
  status: WorkflowTaskStatus;
  /** HUMAN_TASK/APPROVAL: who it's currently assigned to. */
  assigneeId?: string;
  /** Original assignee, if this task was delegated. */
  delegatedFromId?: string;
  dueAt?: Date;
  startedAt: Date;
  completedAt?: Date;
  outputData?: Record<string, unknown>;
  errorMessage?: string;
  attempts: number;
  maxAttempts: number;
}

/** Contract every task executor (human/automated/scheduled/external) implements. */
export interface IWorkflowTaskExecutor {
  /** Runs the step's automated work, if any. Human/approval steps return immediately (they wait for external action). */
  execute(task: IWorkflowTask, context: Record<string, unknown>): Promise<IWorkflowTaskResult>;
}

export interface IWorkflowTaskResult {
  success: boolean;
  /** Data to merge into the workflow instance's context. */
  outputData?: Record<string, unknown>;
  errorMessage?: string;
  /** True if the step should stay PENDING/IN_PROGRESS awaiting external completion (human task, external callback). */
  awaitingExternalCompletion?: boolean;
}
