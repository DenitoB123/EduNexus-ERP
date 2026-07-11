/**
 * workflow-template.service.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * "Templates" here are in-memory factory functions producing a draft
 * IWorkflowDefinition for a common shape (single approval, sequential
 * process, parallel process) — business modules call one of these to get
 * a sensible starting graph, tweak it, then publish via
 * WorkflowVersioningService.publishNewVersion(). Templates are not
 * persisted separately from the definitions they produce; there's nothing
 * to duplicate against WorkflowDefinitionRepository.
 */

import { Injectable } from '@nestjs/common';
import {
  IWorkflowDefinition,
  IWorkflowStepDefinition,
  WorkflowExecutionMode,
  WorkflowStepType,
} from '../interfaces/workflow-definition.interface';
import { IApprovalPolicy } from '../interfaces/approval.interface';

type DefinitionDraft = Omit<IWorkflowDefinition, 'id' | 'tenantId' | 'key' | 'definitionVersion' | 'isActive'>;

@Injectable()
export class WorkflowTemplateService {
  /** START -> single APPROVAL step -> END. The most common approval-only workflow shape. */
  singleApprovalTemplate(name: string, policy: IApprovalPolicy): DefinitionDraft {
    const steps: IWorkflowStepDefinition[] = [
      { id: 'start', name: 'Start', type: WorkflowStepType.START },
      { id: 'approval', name: `${name} Approval`, type: WorkflowStepType.APPROVAL, config: { approvalPolicy: policy } },
      { id: 'end', name: 'End', type: WorkflowStepType.END },
    ];
    return {
      name,
      executionMode: WorkflowExecutionMode.SEQUENTIAL,
      startStepId: 'start',
      steps,
      transitions: [
        { id: 't1', fromStepId: 'start', toStepId: 'approval' },
        { id: 't2', fromStepId: 'approval', toStepId: 'end' },
      ],
    };
  }

  /** START -> step1 -> step2 -> ... -> END, run strictly in order. */
  sequentialProcessTemplate(name: string, taskSteps: IWorkflowStepDefinition[]): DefinitionDraft {
    const steps: IWorkflowStepDefinition[] = [
      { id: 'start', name: 'Start', type: WorkflowStepType.START },
      ...taskSteps,
      { id: 'end', name: 'End', type: WorkflowStepType.END },
    ];
    const chain = ['start', ...taskSteps.map((s) => s.id), 'end'];
    const transitions = chain.slice(0, -1).map((fromStepId, i) => ({
      id: `t${i + 1}`,
      fromStepId,
      toStepId: chain[i + 1],
    }));
    return { name, executionMode: WorkflowExecutionMode.SEQUENTIAL, startStepId: 'start', steps, transitions };
  }

  /** START -> PARALLEL_GATEWAY -> every branchStep concurrently -> END (each branch has its own outgoing transition to 'end'). */
  parallelProcessTemplate(name: string, branchSteps: IWorkflowStepDefinition[]): DefinitionDraft {
    const steps: IWorkflowStepDefinition[] = [
      { id: 'start', name: 'Start', type: WorkflowStepType.START },
      { id: 'gateway', name: 'Fan Out', type: WorkflowStepType.PARALLEL_GATEWAY },
      ...branchSteps,
      { id: 'end', name: 'End', type: WorkflowStepType.END },
    ];
    const transitions = [
      { id: 't-start', fromStepId: 'start', toStepId: 'gateway' },
      ...branchSteps.map((s, i) => ({ id: `t-fanout-${i}`, fromStepId: 'gateway', toStepId: s.id })),
      ...branchSteps.map((s, i) => ({ id: `t-join-${i}`, fromStepId: s.id, toStepId: 'end' })),
    ];
    return { name, executionMode: WorkflowExecutionMode.PARALLEL, startStepId: 'start', steps, transitions };
  }
}
