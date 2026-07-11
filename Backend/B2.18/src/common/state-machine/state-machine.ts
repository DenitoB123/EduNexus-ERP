/**
 * state-machine.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Generic state machine. Instantiated per-aggregate (e.g. one per
 * WorkflowInstance) rather than injected as a singleton — it holds
 * mutable current-state/history for whatever it's governing.
 *
 * Usage:
 *   const sm = new StateMachine<WorkflowInstanceStatus, 'START'|'COMPLETE'|'FAIL'>(
 *     WorkflowInstanceStatus.RUNNING,
 *     [
 *       { from: WorkflowInstanceStatus.RUNNING, event: 'COMPLETE', to: WorkflowInstanceStatus.COMPLETED },
 *       { from: WorkflowInstanceStatus.RUNNING, event: 'FAIL', to: WorkflowInstanceStatus.FAILED },
 *     ],
 *   );
 *   await sm.transition('COMPLETE');
 */

import {
  IStateMachine,
  IStateTransitionDefinition,
  IStateTransitionResult,
} from '../interfaces/state-machine.interface';

export class StateTransitionRejectedError extends Error {
  constructor(
    public readonly fromState: string,
    public readonly event: string,
    reason: string,
  ) {
    super(`Cannot transition from "${fromState}" on event "${event}": ${reason}`);
    this.name = 'StateTransitionRejectedError';
  }
}

export class StateMachine<TState extends string, TEvent extends string>
  implements IStateMachine<TState, TEvent>
{
  private current: TState;
  private readonly history: TState[] = [];
  private readonly transitions: IStateTransitionDefinition<TState, TEvent>[];

  constructor(initialState: TState, transitions: IStateTransitionDefinition<TState, TEvent>[]) {
    this.current = initialState;
    this.transitions = transitions;
    this.history.push(initialState);
  }

  getCurrentState(): TState {
    return this.current;
  }

  getHistory(): TState[] {
    return [...this.history];
  }

  private findDefinition(event: TEvent): IStateTransitionDefinition<TState, TEvent> | undefined {
    return this.transitions.find((t) => t.from === this.current && t.event === event);
  }

  async canTransition(event: TEvent, context: Record<string, unknown> = {}): Promise<boolean> {
    const def = this.findDefinition(event);
    if (!def) return false;
    if (!def.guard) return true;
    return def.guard(context);
  }

  async transition(
    event: TEvent,
    context: Record<string, unknown> = {},
  ): Promise<IStateTransitionResult<TState>> {
    const def = this.findDefinition(event);
    const fromState = this.current;

    if (!def) {
      return { success: false, fromState, toState: fromState, reason: `No transition defined for event "${event}" from state "${fromState}"` };
    }

    if (def.guard) {
      const allowed = await def.guard(context);
      if (!allowed) {
        return { success: false, fromState, toState: fromState, reason: 'Guard condition rejected the transition' };
      }
    }

    this.current = def.to;
    this.history.push(def.to);

    if (def.onTransition) {
      await def.onTransition(context);
    }

    return { success: true, fromState, toState: def.to };
  }

  /**
   * Reverts to the previous state on the history stack. Intended for
   * rollback-on-failure (e.g. a step's compensation completed, put the
   * instance back to its pre-step state) rather than general-purpose undo
   * — it does not re-run guards or onTransition side effects in reverse.
   */
  rollback(): IStateTransitionResult<TState> {
    const fromState = this.current;
    if (this.history.length < 2) {
      return { success: false, fromState, toState: fromState, reason: 'No prior state to roll back to' };
    }
    this.history.pop(); // discard current
    const previous = this.history[this.history.length - 1];
    this.current = previous;
    return { success: true, fromState, toState: previous };
  }
}

/**
 * Runs `work` with retry-on-failure, per the Workflow Engine's Retry
 * support requirement. Generic (not workflow-specific) so
 * state-transition.validator.ts and step executors can share it.
 */
export async function withRetry<T>(
  work: (attempt: number) => Promise<T>,
  options: { maxAttempts: number; backoffMs: number },
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await work(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < options.maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, options.backoffMs * attempt));
      }
    }
  }
  throw lastError;
}
