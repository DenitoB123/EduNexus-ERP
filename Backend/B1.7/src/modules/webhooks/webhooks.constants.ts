// Defined locally rather than added to src/modules/jobs/jobs.constants.ts —
// keeps the existing QUEUE_NAMES enum (Milestone 1.6) untouched while still
// reusing the same BullModule/Redis connection it set up at the root level.
export const WEBHOOKS_QUEUE_NAME = 'webhooks';

export const WEBHOOK_JOB_NAMES = {
  DELIVER: 'deliver-webhook',
} as const;

export const WEBHOOK_SIGNATURE_HEADER = 'x-edunexus-signature';
export const WEBHOOK_EVENT_HEADER = 'x-edunexus-event';

export const MAX_WEBHOOK_DELIVERY_ATTEMPTS = 5;
