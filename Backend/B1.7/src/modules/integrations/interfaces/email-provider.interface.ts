export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  schoolId?: string;
}

export interface SendEmailResult {
  providerMessageId: string;
}

/** Implemented per email provider (SendGrid, SES, ...). NotificationsModule (1.5) should depend on this for its email channel rather than calling a provider SDK directly. */
export interface EmailProvider {
  readonly key: string;
  send(params: SendEmailParams): Promise<SendEmailResult>;
}
