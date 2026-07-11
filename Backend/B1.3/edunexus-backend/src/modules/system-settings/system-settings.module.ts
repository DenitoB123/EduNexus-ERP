import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { SystemSettingsService } from './system-settings.service';
import { SystemSettingsController } from './system-settings.controller';
import { SecurityModule } from '../security/security.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

// ─────────────────────────────────────────────────────────────────────────────
// SystemSettingsModule — Milestone 1.3
// In-memory cache (cache-manager) keeps hot-path reads (e.g. feature flags
// checked on every request) off the database. Swap to a Redis cache store
// later without touching SystemSettingsService's public API.
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  imports: [
    CacheModule.register({
      ttl: 5 * 60 * 1000, // 5 minutes, matches SystemSettingsService default
      max: 500,
    }),
    SecurityModule,
    AuditLogModule,
  ],
  controllers: [SystemSettingsController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
