/**
 * workflow-definition.interface.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Shape of a versioned, reusable workflow definition (the "template" a
 * WorkflowInstance is created from). Definitions are declarative: a graph
 * of steps + transitions, evaluated by WorkflowEngineService at runtime.
 * No business module hardcodes a workflow in code — it registers a
 * WorkflowDefinition (directly or via WorkflowTemplateService) and the
 * engine drives it generically.
 */

export enum WorkflowStepType {
  HUMAN_TASK = 'HUMAN_TASK',
  AUTOMATED_TASK = 'AUTOMATED_TASK',
  SCHEDULED_TASK = 'SCHEDULED_TASK',
  EXTERNAL_TASK = 'EXTERNAL_TASK',
  APPROVAL = 'APPROVAL',
  PARALLEL_GATEWAY = 'PARALLEL_GATEWAY',
  CONDITIONAL_GATEWAY = 'CONDITIONAL_GATEWAY',
  SUB_PROCESS = 'SUB_PROCESS',
  START = 'START',
  END = 'END',
}

export enum WorkflowExecutionMode {
  SEQUENTIAL = 'SEQUENTIAL',
  PARALLEL = 'PARALLEL',
}

/** A guard/condition expression evaluated by the Business Rule Engine's expression engine. */
export interface IWorkflowCondition {
  /** e.g. "context.amount > 10000", evaluated by ExpressionEngine against IWorkflowExecutionContext. */
  expression: string;
  description?: string;
}

export interface IWorkflowTransition {
  id: string;
  fromStepId: string;
  toStepId: string;
  /** Absent = unconditional transition. */
  condition?: IWorkflowCondition;
  /** Higher priority transitions are evaluated first when multiple are eligible. */
  priority?: number;
}

export interface IWorkflowStepDefinition {
  id: string;
  name: string;
  type: WorkflowStepType;
  /** For APPROVAL steps: see approval.interface.ts's IApprovalPolicy. For HUMAN_TASK: assignee rule. */
  config?: Record<string, unknown>;
  /** For SUB_PROCESS steps: the nested workflow definition's key + version. */
  subProcessKey?: string;
  subProcessVersion?: number;
  /** Compensation step id to run if this step must be rolled back. */
  compensationStepId?: string;
  /** Retry policy for AUTOMATED_TASK/EXTERNAL_TASK steps. */
  retry?: { maxAttempts: number; backoffMs: number };
  /** Escalation: if a HUMAN_TASK/APPROVAL step isn't actioned within this window, escalate. */
  escalation?: { afterMs: number; escalateToStepId?: string; escalateToRole?: string };
}

export interface IWorkflowDefinition {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  description?: string;
  /**
   * The business-facing template version (v1, v2, v3 of this workflow's
   * design) — distinct from BaseModel's `version` field (optimistic-locking
   * row version, present once this type is intersected with BaseModel in a
   * repository record type, e.g. `IWorkflowDefinition & BaseModel`). A new
   * business version is a new row (see the
   * `@@unique([tenantId, key, definitionVersion])` constraint in
   * schema.workflow.additions.prisma), not an in-place edit — so the two
   * concepts never need to move together.
   */
  definitionVersion: number;
  isActive: boolean;
  executionMode: WorkflowExecutionMode;
  steps: IWorkflowStepDefinition[];
  transitions: IWorkflowTransition[];
  startStepId: string;
  metadata?: Record<string, unknown>;
}

/** Runtime data bag threaded through a workflow instance's execution; what conditions/rules evaluate against. */
export interface IWorkflowExecutionContext {
  tenantId: string;
  actorId?: string;
  correlationId?: string;
  variables: Record<string, unknown>;
}
