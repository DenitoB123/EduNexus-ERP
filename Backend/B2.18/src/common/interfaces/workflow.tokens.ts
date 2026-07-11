/**
 * workflow.tokens.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Injection tokens for the workflow framework's own repository contracts.
 * Everything the framework needs from *other* infrastructure (events, jobs,
 * logging, tenancy) already has concrete, injectable classes in B1.1–B2.2
 * (EventBus, JobQueueService, ScheduledJobsService, AppLoggerService,
 * TenantContextService) — those are injected directly by class reference,
 * not re-tokenized here, per the "do not recreate/duplicate DI tokens"
 * instruction.
 */

export const WORKFLOW_DEFINITION_REPOSITORY = Symbol('WORKFLOW_DEFINITION_REPOSITORY');
export const WORKFLOW_INSTANCE_REPOSITORY = Symbol('WORKFLOW_INSTANCE_REPOSITORY');
export const WORKFLOW_TASK_REPOSITORY = Symbol('WORKFLOW_TASK_REPOSITORY');
export const APPROVAL_REQUEST_REPOSITORY = Symbol('APPROVAL_REQUEST_REPOSITORY');
export const WORKFLOW_EXECUTION_LOG_REPOSITORY = Symbol('WORKFLOW_EXECUTION_LOG_REPOSITORY');

/**
 * Optional extension point: a business module can bind a rule-data
 * resolver under this token so the expression engine can look up
 * entity/context fields it doesn't already have inline (e.g. "does this
 * user hold role X" for an approval condition). Left unbound by default —
 * the expression engine works fine against the context object it's given
 * without one.
 */
export const RULE_DATA_RESOLVER = Symbol('RULE_DATA_RESOLVER');
