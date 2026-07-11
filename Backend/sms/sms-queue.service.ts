import { Injectable, OnModuleInit } from '@nestjs/common';
import { JobQueueService } from '../jobs/job-queue.service';
import { JobRegistry } from '../jobs/job-registry.service';
import { SendSmsJobHandler, SEND_SMS_JOB_NAME } from './send-sms.job-handler';
import { SendSmsInput } from '../interfaces/notification.interface';

@Injectable()
export class SmsQueueService implements OnModuleInit {
  constructor(
    private readonly jobQueueService: JobQueueService,
    private readonly jobRegistry: JobRegistry,
    private readonly sendSmsJobHandler: SendSmsJobHandler,
  ) {}

  onModuleInit(): void {
    this.jobRegistry.register(this.sendSmsJobHandler);
  }

  async enqueue(input: SendSmsInput): Promise<string> {
    return this.jobQueueService.enqueue(SEND_SMS_JOB_NAME, input);
  }
}
