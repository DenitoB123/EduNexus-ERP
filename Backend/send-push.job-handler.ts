import { Injectable } from '@nestjs/common';
import { JobHandlerBase } from '../jobs/job-handler.base';
import { JobPayload } from '../interfaces/job.interface';
import { SendPushInput } from '../interfaces/notification.interface';
import { PushService } from './push.service';

export const SEND_PUSH_JOB_NAME = 'send-push';

@Injectable()
export class SendPushJobHandler extends JobHandlerBase<SendPushInput> {
  readonly name = SEND_PUSH_JOB_NAME;

  constructor(private readonly pushService: PushService) {
    super();
  }

  async process(payload: JobPayload<SendPushInput>): Promise<void> {
    await this.pushService.send(payload.data);
  }
}
