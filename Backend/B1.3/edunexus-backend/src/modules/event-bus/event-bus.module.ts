import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusService } from './event-bus.service';

// ─────────────────────────────────────────────────────────────────────────────
// EventBusModule — Milestone 1.3
// In-process publish/subscribe, backed by EventEmitter2. Intended as the
// framework other modules build on for: user created, student registered,
// payment completed, audit triggers. The SystemEvent table this writes to
// is the seed for a future outbox-pattern relay onto a real message broker
// when EduNexus splits into microservices.
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {}
