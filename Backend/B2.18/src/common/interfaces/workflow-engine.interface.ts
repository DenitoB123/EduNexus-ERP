/**
 * workflow-engine.interface.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 */

import { IWorkflowDefinition, IWorkflowStepDefinition } from './workflow-definition.interface';
import { IWorkflowInstance } from './workflow-instance.interface';
import { WorkflowTriggerType } from './workflow-instance.interface';

export interface IStartWorkflowOptions {
  tenantId: string;
  definitionKey: string;
  /** Omit for latest active version. */
  definitionVersion?: number;
  triggerType: WorkflowTriggerType;
  triggeredBy?: string;
  initialContext?: Record<string, unknown>;
  parentInstanceId?: string;
}

/** Top-level entry point business modules use to run a workflow — see workflow/workflow-engine.service.ts. */
export interface IWorkflowEngine {
  start(options: IStartWorkflowOptions): Promise<IWorkflowInstance>;
  /** Advances an instance's current step(s) — called by task completion, approval decisions, or the automation framework. */
  advance(instanceId: string, stepId: string, outputData?: Record<string, unknown>): Promise<IWorkflowInstance>;
  cancel(instanceId: string, reason?: string): Promise<IWorkflowInstance>;
  suspend(instanceId: string): Promise<IWorkflowInstance>;
  resume(instanceId: string): Promise<IWorkflowInstance>;
  retry(instanceId: string, stepId: string): Promise<IWorkflowInstance>;
  getInstance(instanceId: string): Promise<IWorkflowInstance | null>;
}

/** Drives a single step's execution — resolves the right IWorkflowTaskExecutor for the step type and runs it. */
export interface IWorkflowExecutor {
  executeStep(
    instance: IWorkflowInstance,
    step: IWorkflowStepDefinition,
  ): Promise<{ completed: boolean; outputData?: Record<string, unknown>; errorMessage?: string }>;
}

/** Registered per-definition, drives compensation on failure/rollback. */
export interface ICompensationHandler {
  compensate(instance: IWorkflowInstance, step: IWorkflowStepDefinition): Promise<void>;
}
