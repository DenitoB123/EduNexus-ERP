/**
 * audit.service.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 *
 * Performance design (per this milestone's explicit requirements —
 * Async Logging, Batch Persistence, Minimal Request Overhead):
 * `record()` never awaits a database write. It pushes onto an in-memory
 * buffer and returns immediately; a timer flushes the buffer to
 * AuditEventRepository.createMany() every `flushIntervalMs`, or
 * immediately once the buffer reaches `maxBufferSize`, whichever comes
 * first. `onModuleDestroy` does a final synchronous-as-possible flush so
 * buffered events aren't lost on a clean shutdown.
 *
 * Trade-off, stated plainly: a hard crash (not a graceful shutdown)
 * between two flush intervals can lose up to `maxBufferSize` recent
 * audit events. That's the accepted cost of "never let audit logging
 * slow down or fail a real request" — the alternative (awaiting a DB
 * write per event) directly contradicts the "Minimal Request Overhead"
 * requirement. If a business module needs a specific audit write to be
 * durable before it proceeds (rare — legal-hold placement is the one
 * candidate in this framework), call `flush()` explicitly after
 * `record()`.
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { AuditEventRepository } from './repositories/audit-event.repository';
import { AppLoggerService } from '../logger/app-logger.service';
import { IAuditService } from '../interfaces/audit-service.interface';
import { RecordAuditEventInput } from '../interfaces/audit-event.interface';

const DEFAULT_FLUSH_INTERVAL_MS = 2000;
const DEFAULT_MAX_BUFFER_SIZE = 200;

@Injectable()
export class AuditService implements IAuditService, OnModuleDestroy {
  private buffer: (RecordAuditEventInput & { actorType: string; legalHoldExempt: boolean })[] = [];
  private flushTimer: NodeJS.Timeout | undefined;
  private flushing = false;
  private readonly flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS;
  private readonly maxBufferSize = DEFAULT_MAX_BUFFER_SIZE;

  constructor(
    private readonly repository: AuditEventRepository,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('AuditService');
    this.flushTimer = setInterval(() => void this.flush(), this.flushIntervalMs);
    // Don't let this timer keep the Node process alive on its own.
    this.flushTimer.unref?.();
  }

  record(input: RecordAuditEventInput): void {
    this.buffer.push({ actorType: 'user', legalHoldExempt: false, ...input });
    if (this.buffer.length >= this.maxBufferSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return;
    this.flushing = true;

    const batch = this.buffer;
    this.buffer = [];

    try {
      await this.repository.createMany(batch);
    } catch (error) {
      // Never throw out of the audit path — log and drop this batch
      // rather than risk retrying forever and unbounded-growing memory.
      this.logger.error(
        `Failed to persist a batch of ${batch.length} audit events`,
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.flushing = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flush();
  }
}
