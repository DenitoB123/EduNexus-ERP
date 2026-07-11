import { Injectable } from '@nestjs/common';
import { JobHandlerBase } from '../jobs/job-handler.base';
import { JobPayload } from '../interfaces/job.interface';
import { SendSmsInput } from '../interfaces/notification.interface';
import { SmsService } from './sms.service';

export const SEND_SMS_JOB_NAME = 'send-sms';

@Injectable()
export class SendSmsJobHandler extends JobHandlerBase<SendSmsInput> {
  readonly name = SEND_SMS_JOB_NAME;

  constructor(private readonly smsService: SmsService) {
    super();
  }

  async process(payload: JobPayload<SendSmsInput>): Promise<void> {
    await this.smsService.send(payload.data);
  }
}
