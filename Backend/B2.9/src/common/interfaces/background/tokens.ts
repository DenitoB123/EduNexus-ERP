/**
 * tokens.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * DI tokens for this framework. Named distinctly from B2.3's
 * common/interfaces/tokens.ts (APP_LOGGER, EXCEPTION_FACTORY,
 * TRANSACTION_MANAGER, DOMAIN_EVENT_PUBLISHER, PERMISSION_CHECKER,
 * REQUEST_CONTEXT, BASE_REPOSITORY, AUDIT_FIELD_STRATEGY) — this module
 * consumes those tokens (see providers/queue-provider.module.ts and
 * jobs/job-processor.base.ts) rather than redeclaring them.
 */

export const QUEUE_PROVIDER = Symbol('QUEUE_PROVIDER');
export const JOB_SCHEDULER = Symbol('JOB_SCHEDULER');
export const QUEUE_MONITOR = Symbol('QUEUE_MONITOR');
export const RETRY_POLICY = Symbol('RETRY_POLICY');
