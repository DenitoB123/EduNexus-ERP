import { Injectable, OnModuleInit } from '@nestjs/common';
import { JobQueueService } from '../jobs/job-queue.service';
import { JobRegistry } from '../jobs/job-registry.service';
import { SendPushJobHandler, SEND_PUSH_JOB_NAME } from './send-push.job-handler';
import { SendPushInput } from '../interfaces/notification.interface';

@Injectable()
export class NotificationQueueService implements OnModuleInit {
  constructor(
    private readonly jobQueueService: JobQueueService,
    private readonly jobRegistry: JobRegistry,
    private readonly sendPushJobHandler: SendPushJobHandler,
  ) {}

  onModuleInit(): void {
    this.jobRegistry.register(this.sendPushJobHandler);
  }

  async enqueue(input: SendPushInput): Promise<string> {
    return this.jobQueueService.enqueue(SEND_PUSH_JOB_NAME, input);
  }
}
