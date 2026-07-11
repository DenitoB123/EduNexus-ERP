import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';

// ─────────────────────────────────────────────────────────────────────────────
// AuditLogModule — Milestone 1.3
// Exports AuditLogService for any module that imports AuditLogModule
// (consistent with how RbacModule exports RbacService).
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
