import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DatabaseMonitoringModule } from '../database/database-monitoring.module';

@Global()
@Module({
  imports: [DatabaseMonitoringModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
