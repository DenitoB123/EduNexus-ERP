/**
 * state-machine.interface.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Generic, reusable state machine contract — not workflow-specific. The
 * Workflow Engine uses one internally to govern WorkflowInstanceStatus
 * transitions, but any future module (order status, application status,
 * ticket status, etc.) can instantiate StateMachine<TState, TEvent>
 * directly instead of hand-rolling its own transition guards.
 */

export interface IStateTransitionDefinition<TState extends string, TEvent extends string> {
  from: TState;
  event: TEvent;
  to: TState;
  /** Optional guard; transition is rejected if this returns false. */
  guard?: (context: Record<string, unknown>) => boolean | Promise<boolean>;
  /** Optional side effect run after the transition is committed. */
  onTransition?: (context: Record<string, unknown>) => void | Promise<void>;
}

export interface IStateTransitionResult<TState extends string> {
  success: boolean;
  fromState: TState;
  toState: TState;
  reason?: string;
}

export interface IStateMachine<TState extends string, TEvent extends string> {
  getCurrentState(): TState;
  canTransition(event: TEvent, context?: Record<string, unknown>): Promise<boolean>;
  transition(event: TEvent, context?: Record<string, unknown>): Promise<IStateTransitionResult<TState>>;
  /** Reverts to the previous state on the internal history stack (one-step undo), used for rollback-on-failure. */
  rollback(): IStateTransitionResult<TState>;
  getHistory(): TState[];
}
