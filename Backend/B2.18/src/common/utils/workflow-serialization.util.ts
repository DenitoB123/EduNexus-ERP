/**
 * workflow-serialization.util.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 */

import { IWorkflowDefinition } from '../interfaces/workflow-definition.interface';
import { IWorkflowInstance } from '../interfaces/workflow-instance.interface';

/** Serializes a definition/instance to a JSON string with a schema version tag, for export or cross-service transfer. */
export function serializeWorkflowDefinition(definition: IWorkflowDefinition): string {
  return JSON.stringify({ schemaVersion: 1, kind: 'WorkflowDefinition', payload: definition });
}

export function deserializeWorkflowDefinition(serialized: string): IWorkflowDefinition {
  const parsed = JSON.parse(serialized) as { schemaVersion: number; kind: string; payload: IWorkflowDefinition };
  if (parsed.kind !== 'WorkflowDefinition') {
    throw new Error(`Expected a serialized WorkflowDefinition, got kind "${parsed.kind}"`);
  }
  if (parsed.schemaVersion !== 1) {
    throw new Error(`Unsupported WorkflowDefinition schema version: ${parsed.schemaVersion}`);
  }
  return parsed.payload;
}

export function serializeWorkflowInstanceSnapshot(instance: IWorkflowInstance): string {
  return JSON.stringify({ schemaVersion: 1, kind: 'WorkflowInstanceSnapshot', payload: instance });
}
