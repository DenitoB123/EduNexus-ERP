import { Global, Module } from '@nestjs/common';
import { JobModule } from '../jobs/job.module';
import { SmsFactory } from './sms.factory';
import { SmsService } from './sms.service';
import { SendSmsJobHandler } from './send-sms.job-handler';
import { SmsQueueService } from './sms-queue.service';

@Global()
@Module({
  imports: [JobModule],
  providers: [SmsFactory, SmsService, SendSmsJobHandler, SmsQueueService],
  exports: [SmsService, SmsQueueService],
})
export class SmsModule {}
