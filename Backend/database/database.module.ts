import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DatabaseMonitoringModule } from './database-monitoring.module';
import { TenantContextService } from './context/tenant-context.service';
import { TenantResolver } from './context/tenant.resolver';
import { TenantIsolationMiddleware } from './context/tenant-isolation.middleware';
import { TransactionService } from './services/transaction.service';
import { DatabaseHealthService } from './services/database-health.service';
import { DatabaseService } from './services/database.service';

@Global()
@Module({
  imports: [PrismaModule, DatabaseMonitoringModule],
  providers: [
    TenantContextService,
    TenantResolver,
    TenantIsolationMiddleware,
    TransactionService,
    DatabaseHealthService,
    DatabaseService,
  ],
  exports: [
    TenantContextService,
    TenantResolver,
    TenantIsolationMiddleware,
    TransactionService,
    DatabaseHealthService,
    DatabaseService,
  ],
})
export class DatabaseModule {}
