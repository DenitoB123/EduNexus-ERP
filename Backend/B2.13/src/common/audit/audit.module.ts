/**
 * audit.module.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 *
 * @Global() so ActivityLoggerService/AuditSearchService/etc. and the
 * @Audit()/@AuditIgnore() decorators are usable from any future business
 * module without each one importing AuditModule explicitly — the same
 * convention CommonModule/EventModule already use in this codebase.
 * AuditInterceptor itself is registered as a global APP_INTERCEPTOR in
 * app.module.ts (not here) so its position in the interceptor chain
 * relative to LoggingInterceptor is explicit and visible in one place —
 * see app.module.ts's own comment on interceptor ordering.
 */

import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AppLoggerModule } from '../logger/app-logger.module';
import { SecurityModule } from '../../security/security.module';
import { SchedulerModule } from '../../infrastructure/scheduler/scheduler.module';

import { AuditEventRepository } from './repositories/audit-event.repository';
import { EntityChangeLogRepository } from './repositories/entity-change-log.repository';
import { RetentionPolicyRepository, LegalHoldRepository } from './repositories/compliance.repository';

import { AuditService } from './audit.service';
import { ActivityLoggerService } from './activity-logger.service';
import { EntityHistoryService } from './entity-history.service';
import { AuditSearchService } from './audit-search.service';
import { AuditExportService } from './audit-export.service';
import { AuditAlertService } from './audit-alert.service';
import { ActivityTimelineService } from './activity-timeline.service';
import { ComplianceService } from './compliance.service';
import { CompliancePurgeScheduler } from './compliance-purge.scheduler';

import { AuditInterceptor } from '../interceptors/audit.interceptor';

@Global()
@Module({
  imports: [PrismaModule, AppLoggerModule, SecurityModule, SchedulerModule],
  providers: [
    // Repositories
    AuditEventRepository,
    EntityChangeLogRepository,
    RetentionPolicyRepository,
    LegalHoldRepository,

    // Services
    AuditService,
    AuditAlertService,
    ActivityLoggerService,
    EntityHistoryService,
    AuditSearchService,
    AuditExportService,
    ActivityTimelineService,
    ComplianceService,
    CompliancePurgeScheduler,

    // Interceptor (also provided here so it can be injected directly in
    // tests / other interceptors if needed; registered globally via
    // APP_INTERCEPTOR in app.module.ts is what makes it actually run)
    AuditInterceptor,
  ],
  exports: [
    AuditService,
    ActivityLoggerService,
    EntityHistoryService,
    AuditSearchService,
    AuditExportService,
    AuditAlertService,
    ActivityTimelineService,
    ComplianceService,
    AuditInterceptor,
  ],
})
export class AuditModule {}
