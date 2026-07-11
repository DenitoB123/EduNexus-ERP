import { Injectable, OnModuleInit } from '@nestjs/common';
import { EmailFactory } from './email.factory';
import { EmailTemplateEngine } from './email-template.engine';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { IEmailProvider, SendEmailInput } from '../interfaces/notification.interface';

@Injectable()
export class EmailService implements OnModuleInit {
  private provider!: IEmailProvider;

  constructor(
    private readonly emailFactory: EmailFactory,
    private readonly templateEngine: EmailTemplateEngine,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('EmailService');
  }

  onModuleInit(): void {
    this.provider = this.emailFactory.create();
  }

  async send(input: SendEmailInput): Promise<void> {
    await this.provider.send(input);
    this.logger.debug(`Sent email to ${Array.isArray(input.to) ? input.to.join(',') : input.to}`);
  }

  async sendFromTemplate(
    to: string | string[],
    subject: string,
    templateSource: string,
    context: Record<string, unknown>,
  ): Promise<void> {
    const html = this.templateEngine.render(templateSource, context);
    await this.send({ to, subject, html });
  }
}
