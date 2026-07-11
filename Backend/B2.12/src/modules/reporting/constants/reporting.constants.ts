/**
 * B2.12 — Enterprise Reporting & Export Infrastructure
 *
 * Central constants for job names, event names, cache keys, and
 * default limits used across the reporting module. Kept in one file
 * so consuming modules (B2.21 merge, and future feature modules that
 * register datasets/report definitions) have a single source to
 * reference instead of magic strings.
 */

/** Background job names, routed through the existing JobQueueService/JobRegistry. */
export const REPORTING_JOB_NAMES = {
  GENERATE_REPORT: 'reporting.generate-report',
  EXECUTE_SCHEDULED_REPORT: 'reporting.execute-scheduled-report',
} as const;

/** Domain event names, emitted via the existing EventBus. */
export const REPORTING_EVENT_NAMES = {
  GENERATION_REQUESTED: 'reporting.generation.requested',
  GENERATION_COMPLETED: 'reporting.generation.completed',
  GENERATION_FAILED: 'reporting.generation.failed',
  EXPORTED: 'reporting.export.completed',
  DOWNLOADED: 'reporting.download.completed',
  SCHEDULED_REPORT_EXECUTED: 'reporting.scheduled.executed',
  TEMPLATE_CREATED: 'reporting.template.created',
  TEMPLATE_UPDATED: 'reporting.template.updated',
  SCHEDULE_CREATED: 'reporting.schedule.created',
  SCHEDULE_UPDATED: 'reporting.schedule.updated',
  SCHEDULE_REMOVED: 'reporting.schedule.removed',
} as const;

/** Cache key prefixes (used with the existing CacheService). */
export const REPORTING_CACHE_KEYS = {
  DATASET_PREVIEW: (datasetKey: string, tenantId: string) => `reporting:preview:${tenantId}:${datasetKey}`,
  REPORT_DEFINITION: (reportKey: string) => `reporting:definition:${reportKey}`,
} as const;

/** Storage key prefix under which generated report files are uploaded. */
export const REPORTING_STORAGE_PREFIX = 'reports';

/** Cron naming prefix for tasks registered against SchedulerRegistry / ScheduledTaskRegistry. */
export const REPORTING_CRON_TASK_PREFIX = 'reporting:scheduled-report:';

/** Threshold above which a report is generated asynchronously (queued) rather than inline. */
export const REPORTING_SYNC_ROW_LIMIT = 2000;

/** Default pagination applied to report previews/dataset queries when none is supplied. */
export const REPORTING_DEFAULT_PAGE_SIZE = 50;

/** Max attempts for a queued report generation job before it is marked FAILED permanently. */
export const REPORTING_MAX_GENERATION_ATTEMPTS = 3;

/** Default signed URL expiry (seconds) for secure report downloads. */
export const REPORTING_DOWNLOAD_URL_TTL_SECONDS = 900;
