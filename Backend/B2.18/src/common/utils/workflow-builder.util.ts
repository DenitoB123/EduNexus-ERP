/**
 * workflow-builder.util.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Fluent builder for constructing a workflow definition draft
 * programmatically, as an alternative to WorkflowTemplateService's
 * fixed shapes or hand-writing the steps/transitions arrays. Produces the
 * same DefinitionDraft shape WorkflowVersioningService.publishNewVersion()
 * expects.
 *
 * Usage:
 *   const draft = new WorkflowBuilder('Leave Request')
 *     .addStep({ id: 'start', name: 'Start', type: WorkflowStepType.START })
 *     .addStep({ id: 'manager-approval', name: 'Manager Approval', type: WorkflowStepType.APPROVAL, config: { approvalPolicy } })
 *     .addStep({ id: 'end', name: 'End', type: WorkflowStepType.END })
 *     .connect('start', 'manager-approval')
 *     .connect('manager-approval', 'end')
 *     .startAt('start')
 *     .build();
 */

import {
  IWorkflowDefinition,
  IWorkflowStepDefinition,
  IWorkflowTransition,
  WorkflowExecutionMode,
} from '../interfaces/workflow-definition.interface';

type DefinitionDraft = Omit<IWorkflowDefinition, 'id' | 'tenantId' | 'key' | 'definitionVersion' | 'isActive'>;

export class WorkflowBuilderError extends Error {}

export class WorkflowBuilder {
  private steps: IWorkflowStepDefinition[] = [];
  private transitions: IWorkflowTransition[] = [];
  private executionMode: WorkflowExecutionMode = WorkflowExecutionMode.SEQUENTIAL;
  private startStepId: string | null = null;
  private metadata: Record<string, unknown> | undefined;
  private transitionCounter = 0;

  constructor(private readonly name: string, private readonly description?: string) {}

  addStep(step: IWorkflowStepDefinition): this {
    if (this.steps.some((s) => s.id === step.id)) {
      throw new WorkflowBuilderError(`Step id "${step.id}" already added`);
    }
    this.steps.push(step);
    return this;
  }

  connect(fromStepId: string, toStepId: string, condition?: IWorkflowTransition['condition'], priority?: number): this {
    this.transitionCounter += 1;
    this.transitions.push({ id: `t${this.transitionCounter}`, fromStepId, toStepId, condition, priority });
    return this;
  }

  startAt(stepId: string): this {
    this.startStepId = stepId;
    return this;
  }

  withExecutionMode(mode: WorkflowExecutionMode): this {
    this.executionMode = mode;
    return this;
  }

  withMetadata(metadata: Record<string, unknown>): this {
    this.metadata = metadata;
    return this;
  }

  build(): DefinitionDraft {
    if (!this.startStepId) {
      throw new WorkflowBuilderError('startAt() must be called before build()');
    }
    if (this.steps.length === 0) {
      throw new WorkflowBuilderError('At least one step must be added before build()');
    }
    return {
      name: this.name,
      description: this.description,
      executionMode: this.executionMode,
      steps: this.steps,
      transitions: this.transitions,
      startStepId: this.startStepId,
      metadata: this.metadata,
    };
  }
}
