import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/prisma.module';
import { CoreModule } from './core/core.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { SecurityModule } from './modules/security/security.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { SystemSettingsModule } from './modules/system-settings/system-settings.module';
import { EventBusModule } from './modules/event-bus/event-bus.module';
import { FileModule } from './modules/file/file.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { HealthModule } from './modules/health/health.module';
// ── Milestone 1.4 ─────────────────────────────────────────────────────────
import { ContextModule } from './modules/context/context.module';
import { SharedModule } from './modules/shared/shared.module';
import { DomainModule } from './modules/domain/domain.module';

@Module({
  imports: [
    // 1. Config — must be first; all modules depend on it
    AppConfigModule,

    // 2. Database
    DatabaseModule,

    // 3. Core infrastructure hub
    CoreModule,

    // ── Milestone 1.2 ─────────────────────────────────────────────────────
    // 4. Tenancy — middleware runs before everything else
    TenancyModule,

    // 5. Auth — registers global JwtAuthGuard via APP_GUARD
    AuthModule,

    // 6. RBAC — registers global RolesGuard via APP_GUARD
    RbacModule,

    // 7. Users
    UserModule,

    // ── Milestone 1.3 — Security & System Infrastructure Core ─────────────
    // 8. Security primitives (encryption, password, token) — no controllers,
    //    just reusable providers consumed by other modules.
    SecurityModule,

    // 9. Audit log — global write path for auth/admin/data-change events
    AuditLogModule,

    // 10. System settings — tenant-aware key/value config store
    SystemSettingsModule,

    // 11. Event bus — internal pub/sub, seeds future microservices split
    EventBusModule,

    // 12. File management — S3-compatible uploads with tenant isolation
    FileModule,

    // 13. Background jobs — Bull/Redis queues (email, notifications, reports, AI)
    JobsModule,

    // 14. Health checks — DB + Redis liveness/readiness
    HealthModule,

    // ── Milestone 1.4 — Shared Core Framework + Domain Abstraction ────────
    // 15. Context — request-scoped userId/role/schoolId, used by ALL services
    ContextModule,

    // 16. Shared — BaseService, BaseController, Pagination, ResponseDto
    SharedModule,

    // 17. Domain — entity abstractions, repository contracts, interfaces
    DomainModule,

    // ── Future milestones ─────────────────────────────────────────────────
    // NotificationModule (2.x)
    // LmsModule        (3.x)
  ],
})
export class AppModule {}
