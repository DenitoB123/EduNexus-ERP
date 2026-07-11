export const JOB_QUEUES = {
  EMAIL: 'email',
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
  AI_PROCESSING: 'ai-processing',
} as const;

export type JobQueueName = (typeof JOB_QUEUES)[keyof typeof JOB_QUEUES];

export const JOB_NAMES = {
  SEND_EMAIL: 'send-email',
  SEND_NOTIFICATION: 'send-notification',
  GENERATE_REPORT: 'generate-report',
  AI_PROCESS: 'ai-process',
} as const;

// ── Payload contracts ─────────────────────────────────────────────────────────

export interface SendEmailJobData {
  to: string;
  subject: string;
  template: string;
  context?: Record<string, unknown>;
  schoolId?: string | null;
}

export interface SendNotificationJobData {
  userId: string;
  title: string;
  body: string;
  schoolId?: string | null;
}

export interface GenerateReportJobData {
  reportType: string;
  requestedBy: string;
  schoolId?: string | null;
  params?: Record<string, unknown>;
}

export interface AiProcessJobData {
  task: string;
  schoolId?: string | null;
  input: Record<string, unknown>;
}
