import { Injectable, OnModuleInit } from '@nestjs/common';
import { JobQueueService } from '../jobs/job-queue.service';
import { JobRegistry } from '../jobs/job-registry.service';
import { SendEmailJobHandler, SEND_EMAIL_JOB_NAME } from './send-email.job-handler';
import { SendEmailInput } from '../interfaces/notification.interface';

@Injectable()
export class EmailQueueService implements OnModuleInit {
  constructor(
    private readonly jobQueueService: JobQueueService,
    private readonly jobRegistry: JobRegistry,
    private readonly sendEmailJobHandler: SendEmailJobHandler,
  ) {}

  onModuleInit(): void {
    this.jobRegistry.register(this.sendEmailJobHandler);
  }

  async enqueue(input: SendEmailInput): Promise<string> {
    return this.jobQueueService.enqueue(SEND_EMAIL_JOB_NAME, input);
  }
}
