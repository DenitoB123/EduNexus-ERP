export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: EmailAttachment[];
}

export interface IEmailProvider {
  send(input: SendEmailInput): Promise<void>;
}

export interface SendSmsInput {
  to: string;
  message: string;
}

export interface ISmsProvider {
  send(input: SendSmsInput): Promise<void>;
}

export interface SendPushInput {
  deviceTokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface IPushProvider {
  send(input: SendPushInput): Promise<void>;
}
