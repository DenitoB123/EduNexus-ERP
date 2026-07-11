import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MulterModule } from '@nestjs/platform-express';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/prisma.module';
import { CoreModule } from './core/core.module';

// ── Milestone 1.2 ─────────────────────────────────────────────────────────────
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { AuthModule } from './modules/auth/auth.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { UserModule } from './modules/user/user.module';

// ── Milestone 1.3 ─────────────────────────────────────────────────────────────
import { SecurityModule } from './modules/security/security.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { SystemSettingsModule } from './modules/system-settings/system-settings.module';
import { EventBusModule } from './modules/event-bus/event-bus.module';
import { FileModule } from './modules/file/file.module';

// ── Milestone 1.4 ─────────────────────────────────────────────────────────────
import { ContextModule } from './modules/context/context.module';
import { SharedModule } from './modules/shared/shared.module';
import { DomainModule } from './modules/domain/domain.module';

// ── Milestone 1.5 ─────────────────────────────────────────────────────────────
import { SearchModule } from './modules/search/search.module';
import { NotificationTemplatesModule } from './modules/notification-templates/notification-templates.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { SegmentationModule } from './modules/segmentation/segmentation.module';

// ── Milestone 1.6 — Final Core Stabilization + System Hardening ───────────────
import { JobsModule } from './modules/jobs/jobs.module';
import { FileStorageModule } from './modules/file-storage/file-storage.module';
import { HealthModule } from './modules/health/health.module';
import { SecurityHardeningModule } from './modules/security-hardening/security-hardening.module';
import { GuardsModule } from './modules/guards/guards.module';
import { ObservabilityModule } from './modules/observability/observability.module';

// ── Milestone 1.7 — Final Infrastructure Hardening (pre-Phase 2) ──────────────
import { CacheModule } from './modules/cache/cache.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { QualityAssuranceModule } from './modules/quality-assurance/quality-assurance.module';

@Module({
  imports: [
    // ── Infra (must be first) ─────────────────────────────────────────────────
    AppConfigModule,
    DatabaseModule,
    CoreModule,
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', global: true }),
    MulterModule.register({ dest: '/tmp/uploads' }),

    // ── 1.6: Observability must be early to trace all subsequent requests ──────
    ObservabilityModule,

    // ── 1.6: Security hardening — rate limiting + IP blocking (global guards) ──
    SecurityHardeningModule,

    // ── 1.7: Cache + Metrics — global, low-level, nothing below depends on
    //    them being loaded in any particular order, but they're infra so they
    //    sit with the rest of the infra block ───────────────────────────────
    CacheModule,
    MetricsModule,

    // ── Milestone 1.2 ─────────────────────────────────────────────────────────
    TenancyModule,
    AuthModule,
    RbacModule,
    UserModule,

    // ── 1.6: Global guards applied after Auth/RBAC modules are loaded ─────────
    GuardsModule,

    // ── Milestone 1.3 ─────────────────────────────────────────────────────────
    SecurityModule,
    AuditLogModule,
    SystemSettingsModule,
    EventBusModule,
    FileModule,

    // ── 1.6: Bull + Redis job queue (replaces/upgrades 1.3 job system) ────────
    JobsModule,

    // ── 1.6: S3-compatible file storage ───────────────────────────────────────
    FileStorageModule,

    // ── 1.7: Integrations before Webhooks — WebhooksInboundController depends
    //    on IntegrationsService for inbound signature verification ───────────
    IntegrationsModule,
    WebhooksModule,

    // ── 1.7: Feature flags — depends on CacheModule/EventBusModule/AuditLogModule,
    //    all already loaded above ───────────────────────────────────────────
    FeatureFlagsModule,

    // ── Milestone 1.4 ─────────────────────────────────────────────────────────
    ContextModule,
    SharedModule,
    DomainModule,

    // ── Milestone 1.5 ─────────────────────────────────────────────────────────
    SearchModule,
    NotificationTemplatesModule,
    NotificationsModule,
    RealtimeModule,
    MonitoringModule,
    SegmentationModule,

    // ── 1.6: Health check (depends on FileStorageModule + JobsModule) ─────────
    HealthModule,

    // ── 1.7: Scheduler (cron) + Quality Assurance — last, since both only run
    //    on a timer/on-demand and depend on virtually everything above ───────
    SchedulerModule,
    QualityAssuranceModule,
  ],
})
export class AppModule {}
