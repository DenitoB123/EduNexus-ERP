export enum ReportExecutionStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ReportDeliveryChannel {
  DOWNLOAD = 'DOWNLOAD',
  EMAIL = 'EMAIL',
  NOTIFICATION = 'NOTIFICATION',
}

export enum ReportTriggerType {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
}
