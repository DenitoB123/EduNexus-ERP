export const SCHEDULED_TASK_NAMES = {
  CLEAN_EXPIRED_REFRESH_TOKENS: 'clean-expired-refresh-tokens',
  PURGE_OLD_AUDIT_LOGS: 'purge-old-audit-logs',
  RETRY_FAILED_WEBHOOKS: 'retry-failed-webhooks',
  RUN_QA_CHECKS: 'run-qa-checks',
} as const;

export type ScheduledTaskName =
  (typeof SCHEDULED_TASK_NAMES)[keyof typeof SCHEDULED_TASK_NAMES];

/** Redis key prefix used for the distributed run-lock (so a task with @Cron only runs once across N replicas). */
export const SCHEDULER_LOCK_PREFIX = 'scheduler:lock';
