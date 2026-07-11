import { Global, Module } from '@nestjs/common';
import { JobModule } from '../jobs/job.module';
import { PushFactory } from './push.factory';
import { PushService } from './push.service';
import { DeviceRegistrationService } from './device-registration.service';
import { SendPushJobHandler } from './send-push.job-handler';
import { NotificationQueueService } from './notification-queue.service';

@Global()
@Module({
  imports: [JobModule],
  providers: [
    PushFactory,
    PushService,
    DeviceRegistrationService,
    SendPushJobHandler,
    NotificationQueueService,
  ],
  exports: [PushService, DeviceRegistrationService, NotificationQueueService],
})
export class PushModule {}
