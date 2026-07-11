import { Module } from '@nestjs/common';
import { QaService } from './qa.service';
import { QaController } from './qa.controller';
import { TenantIsolationCheck } from './checks/tenant-isolation.check';
import { ReferentialIntegrityCheck } from './checks/referential-integrity.check';
import { EventBusModule } from '../event-bus/event-bus.module';

@Module({
  imports: [EventBusModule],
  providers: [QaService, TenantIsolationCheck, ReferentialIntegrityCheck],
  controllers: [QaController],
  exports: [QaService],
})
export class QualityAssuranceModule {}
