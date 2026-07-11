import { Global, Module } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsGuard } from './guards/feature-flags.guard';
import { EventBusModule } from '../event-bus/event-bus.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Global()
@Module({
  imports: [EventBusModule, AuditLogModule],
  providers: [FeatureFlagsService, FeatureFlagsGuard],
  controllers: [FeatureFlagsController],
  exports: [FeatureFlagsService, FeatureFlagsGuard],
})
export class FeatureFlagsModule {}
