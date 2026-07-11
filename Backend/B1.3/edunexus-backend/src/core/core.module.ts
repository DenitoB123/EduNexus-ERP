import { Module } from '@nestjs/common';
import { LoggerModule } from '../common/logger/logger.module';

// ─────────────────────────────────────────────────────────────────────────────
// CoreModule — extended in Milestone 1.2
// Provides global infrastructure: logger (health/events/jobs are now their
// own modules — see HealthModule, EventBusModule, JobsModule — registered
// directly in AppModule rather than folded into CoreModule).
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  imports: [LoggerModule],
  exports: [LoggerModule],
})
export class CoreModule {}
