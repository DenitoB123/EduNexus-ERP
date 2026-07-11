import { Module } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';

// ─────────────────────────────────────────────────────────────────────────────
// HealthModule — Milestone 1.3
// Not in the original 1.3 spec doc, but anticipated by the HealthPing model
// (1.1) and TenancyModule's route exclusion comment ("added in 1.3").
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
