import { Global, Module } from '@nestjs/common';
import { JobModule } from '../jobs/job.module';
import { EmailFactory } from './email.factory';
import { EmailTemplateEngine } from './email-template.engine';
import { EmailService } from './email.service';
import { EmailQueueService } from './email-queue.service';
import { SendEmailJobHandler } from './send-email.job-handler';

@Global()
@Module({
  imports: [JobModule],
  providers: [EmailFactory, EmailTemplateEngine, EmailService, SendEmailJobHandler, EmailQueueService],
  exports: [EmailTemplateEngine, EmailService, EmailQueueService],
})
export class EmailModule {}
