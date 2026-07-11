import * as nodemailer from 'nodemailer';
import { IEmailProvider, SendEmailInput } from '../interfaces/notification.interface';

export interface SmtpProviderConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  defaultFrom: string;
}

export class SmtpProvider implements IEmailProvider {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: SmtpProviderConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user && config.password ? { user: config.user, pass: config.password } : undefined,
    });
  }

  async send(input: SendEmailInput): Promise<void> {
    await this.transporter.sendMail({
      from: input.from ?? this.config.defaultFrom,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    });
  }
}
