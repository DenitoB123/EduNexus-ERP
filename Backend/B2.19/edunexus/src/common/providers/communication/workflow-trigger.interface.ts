export interface WorkflowTriggerContext {
  eventName: string;
  tenantId: string;
  payload: Record<string, unknown>;
}

/**
 * Extension point for the Workflow Framework integration the spec
 * calls for. No Workflow Framework exists in this codebase yet.
 * Registering an `IWorkflowTrigger` under
 * `COMMUNICATION_WORKFLOW_TRIGGER` lets a future workflow engine react
 * to communication events (e.g. "escalate if a flagged message isn't
 * reviewed within 24h") without this module knowing anything about
 * workflows — it just calls `trigger()` on whatever's registered, a
 * no-op until then.
 */
export interface IWorkflowTrigger {
  trigger(context: WorkflowTriggerContext): Promise<void>;
}

export const COMMUNICATION_WORKFLOW_TRIGGER = 'COMMUNICATION_WORKFLOW_TRIGGER';
