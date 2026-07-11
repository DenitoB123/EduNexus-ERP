import { Injectable } from '@nestjs/common';
import { JobHandlerBase } from '../jobs/job-handler.base';
import { JobPayload } from '../interfaces/job.interface';
import { SendEmailInput } from '../interfaces/notification.interface';
import { EmailService } from './email.service';

export const SEND_EMAIL_JOB_NAME = 'send-email';

@Injectable()
export class SendEmailJobHandler extends JobHandlerBase<SendEmailInput> {
  readonly name = SEND_EMAIL_JOB_NAME;

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(payload: JobPayload<SendEmailInput>): Promise<void> {
    await this.emailService.send(payload.data);
  }
}
