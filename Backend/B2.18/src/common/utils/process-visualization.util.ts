/**
 * process-visualization.util.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Produces a plain nodes/edges graph description from a workflow
 * definition (+ optionally a running instance, to mark current/completed
 * nodes) for a frontend to render with any diagramming library — this
 * module deliberately has no rendering/layout logic itself, just the data
 * shape.
 */

import { IWorkflowDefinition, WorkflowStepType } from '../interfaces/workflow-definition.interface';
import { IWorkflowInstance } from '../interfaces/workflow-instance.interface';

export interface IProcessVisualizationNode {
  id: string;
  label: string;
  type: WorkflowStepType;
  state: 'pending' | 'active' | 'completed';
}

export interface IProcessVisualizationEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  conditional: boolean;
}

export interface IProcessVisualization {
  nodes: IProcessVisualizationNode[];
  edges: IProcessVisualizationEdge[];
}

export function buildProcessVisualization(
  definition: IWorkflowDefinition,
  instance?: IWorkflowInstance,
): IProcessVisualization {
  const currentIds = new Set(instance?.currentStepIds ?? []);
  const isTerminalInstance = Boolean(instance && instance.currentStepIds.length === 0 && instance.completedAt);

  const nodes: IProcessVisualizationNode[] = definition.steps.map((step) => ({
    id: step.id,
    label: step.name,
    type: step.type,
    state: currentIds.has(step.id)
      ? 'active'
      : instance && (isTerminalInstance || step.type === WorkflowStepType.START)
        ? 'completed'
        : 'pending',
  }));

  const edges: IProcessVisualizationEdge[] = definition.transitions.map((transition) => ({
    id: transition.id,
    from: transition.fromStepId,
    to: transition.toStepId,
    label: transition.condition?.description,
    conditional: Boolean(transition.condition),
  }));

  return { nodes, edges };
}
