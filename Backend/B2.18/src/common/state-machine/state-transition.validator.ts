/**
 * state-transition.validator.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Builds the standard WorkflowInstanceStatus state machine every workflow
 * instance uses, and validates a workflow definition's step graph for
 * structural soundness before a WorkflowEngineService will run it.
 */

import { Injectable } from '@nestjs/common';
import { StateMachine } from './state-machine';
import { WorkflowInstanceStatus } from '../interfaces/workflow-instance.interface';
import { IWorkflowDefinition } from '../interfaces/workflow-definition.interface';

export type WorkflowInstanceEvent =
  | 'COMPLETE'
  | 'FAIL'
  | 'CANCEL'
  | 'SUSPEND'
  | 'RESUME'
  | 'START_COMPENSATION'
  | 'COMPENSATION_DONE';

@Injectable()
export class StateTransitionValidator {
  /** The canonical WorkflowInstanceStatus transition table, shared by every instance. */
  buildInstanceStateMachine(
    initialState: WorkflowInstanceStatus = WorkflowInstanceStatus.RUNNING,
  ): StateMachine<WorkflowInstanceStatus, WorkflowInstanceEvent> {
    return new StateMachine<WorkflowInstanceStatus, WorkflowInstanceEvent>(initialState, [
      { from: WorkflowInstanceStatus.RUNNING, event: 'COMPLETE', to: WorkflowInstanceStatus.COMPLETED },
      { from: WorkflowInstanceStatus.RUNNING, event: 'FAIL', to: WorkflowInstanceStatus.FAILED },
      { from: WorkflowInstanceStatus.RUNNING, event: 'CANCEL', to: WorkflowInstanceStatus.CANCELLED },
      { from: WorkflowInstanceStatus.RUNNING, event: 'SUSPEND', to: WorkflowInstanceStatus.SUSPENDED },
      { from: WorkflowInstanceStatus.SUSPENDED, event: 'RESUME', to: WorkflowInstanceStatus.RUNNING },
      { from: WorkflowInstanceStatus.SUSPENDED, event: 'CANCEL', to: WorkflowInstanceStatus.CANCELLED },
      { from: WorkflowInstanceStatus.FAILED, event: 'START_COMPENSATION', to: WorkflowInstanceStatus.COMPENSATING },
      { from: WorkflowInstanceStatus.COMPENSATING, event: 'COMPENSATION_DONE', to: WorkflowInstanceStatus.COMPENSATED },
    ]);
  }

  /**
   * Structural validation of a workflow definition: every transition
   * references an existing step, startStepId exists, every non-END step
   * has at least one outgoing transition, and the graph has no orphaned
   * (unreachable) steps. Returns a list of human-readable problems —
   * empty means valid.
   */
  validateDefinition(definition: IWorkflowDefinition): string[] {
    const problems: string[] = [];
    const stepIds = new Set(definition.steps.map((s) => s.id));

    if (!stepIds.has(definition.startStepId)) {
      problems.push(`startStepId "${definition.startStepId}" does not match any step`);
    }

    for (const transition of definition.transitions) {
      if (!stepIds.has(transition.fromStepId)) {
        problems.push(`Transition "${transition.id}" references unknown fromStepId "${transition.fromStepId}"`);
      }
      if (!stepIds.has(transition.toStepId)) {
        problems.push(`Transition "${transition.id}" references unknown toStepId "${transition.toStepId}"`);
      }
    }

    const stepsWithOutgoing = new Set(definition.transitions.map((t) => t.fromStepId));
    for (const step of definition.steps) {
      if (step.type !== 'END' && !stepsWithOutgoing.has(step.id)) {
        problems.push(`Step "${step.id}" (${step.name}) has no outgoing transition and is not an END step`);
      }
    }

    const reachable = new Set<string>([definition.startStepId]);
    let frontier = [definition.startStepId];
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const stepId of frontier) {
        for (const t of definition.transitions.filter((tr) => tr.fromStepId === stepId)) {
          if (!reachable.has(t.toStepId)) {
            reachable.add(t.toStepId);
            next.push(t.toStepId);
          }
        }
      }
      frontier = next;
    }
    for (const step of definition.steps) {
      if (!reachable.has(step.id)) {
        problems.push(`Step "${step.id}" (${step.name}) is unreachable from startStepId`);
      }
    }

    return problems;
  }
}
