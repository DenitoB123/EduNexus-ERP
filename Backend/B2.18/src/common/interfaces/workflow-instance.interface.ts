/**
 * workflow-instance.interface.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Shape of a running (or completed/failed) execution of a WorkflowDefinition.
 */

export enum WorkflowInstanceStatus {
  RUNNING = 'RUNNING',
  SUSPENDED = 'SUSPENDED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
}

export enum WorkflowTriggerType {
  MANUAL = 'MANUAL',
  EVENT = 'EVENT',
  SCHEDULE = 'SCHEDULE',
  API = 'API',
  CHAINED = 'CHAINED',
}

export interface IWorkflowInstance {
  id: string;
  tenantId: string;
  definitionId: string;
  definitionKey: string;
  definitionVersion: number;
  status: WorkflowInstanceStatus;
  currentStepIds: string[];
  context: Record<string, unknown>;
  triggerType: WorkflowTriggerType;
  triggeredBy?: string;
  /** For CHAINED triggers / SUB_PROCESS: the instance that started this one. */
  parentInstanceId?: string;
  startedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
}

export enum WorkflowExecutionLogEventType {
  INSTANCE_STARTED = 'INSTANCE_STARTED',
  STEP_ENTERED = 'STEP_ENTERED',
  STEP_COMPLETED = 'STEP_COMPLETED',
  STEP_FAILED = 'STEP_FAILED',
  STEP_RETRIED = 'STEP_RETRIED',
  TRANSITION_TAKEN = 'TRANSITION_TAKEN',
  APPROVAL_DECIDED = 'APPROVAL_DECIDED',
  ESCALATED = 'ESCALATED',
  DELEGATED = 'DELEGATED',
  COMPENSATION_STARTED = 'COMPENSATION_STARTED',
  COMPENSATION_COMPLETED = 'COMPENSATION_COMPLETED',
  INSTANCE_COMPLETED = 'INSTANCE_COMPLETED',
  INSTANCE_FAILED = 'INSTANCE_FAILED',
  INSTANCE_CANCELLED = 'INSTANCE_CANCELLED',
}

/** Append-only audit trail entry — one row per meaningful engine event, backs Workflow Monitoring. */
export interface IWorkflowExecutionLog {
  id: string;
  tenantId: string;
  instanceId: string;
  stepId?: string;
  eventType: WorkflowExecutionLogEventType;
  actorId?: string;
  message?: string;
  durationMs?: number;
  data?: Record<string, unknown>;
  occurredAt: Date;
}
