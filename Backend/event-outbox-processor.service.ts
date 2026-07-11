import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CronService } from '../scheduler/cron.service';
import { EventBus } from './event-bus.service';
import { EventPublisher } from './event-publisher.service';
import { EventStoreService } from './event-store.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { IEvent } from '../interfaces/event.interface';

const SWEEP_CRON = '*/1 * * * *'; // every minute
const STALE_AFTER_MS = 30_000; // only sweep rows older than 30s, giving the normal flush() a fair chance first
const MAX_ROWS_PER_SWEEP = 200;
const MAX_ATTEMPTS_BEFORE_DEAD_LETTER = 5;

/**
 * B2.7 — Transaction Integration safety net.
 *
 * TransactionalEventPublisher.flush() normally publishes staged events
 * immediately after the originating transaction commits. This
 * processor exists for the narrow window where that doesn't happen
 * (process crash/restart between commit and flush): it periodically
 * finds PENDING DomainEventLog rows older than STALE_AFTER_MS,
 * reconstructs the event from the stored payload, and re-flushes it
 * through the same EventBus/EventPublisher path. Rows that keep
 * failing past MAX_ATTEMPTS_BEFORE_DEAD_LETTER are marked
 * DEAD_LETTERED rather than retried forever.
 */
@Injectable()
export class EventOutboxProcessorService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cronService: CronService,
    private readonly eventBus: EventBus,
    private readonly eventPublisher: EventPublisher,
    private readonly eventStore: EventStoreService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('EventOutboxProcessorService');
  }

  onModuleInit(): void {
    this.cronService.addCron('event-outbox-sweep', SWEEP_CRON, () => this.runScheduledSweep());
  }

  private async runScheduledSweep(): Promise<void> {
    await this.sweep();
  }

  async sweep(): Promise<{ swept: number; deadLettered: number }> {
    const staleBefore = new Date(Date.now() - STALE_AFTER_MS);

    const pendingRows = await this.prisma.domainEventLog.findMany({
      where: { status: 'PENDING', occurredAt: { lt: staleBefore } },
      take: MAX_ROWS_PER_SWEEP,
      orderBy: { occurredAt: 'asc' },
    });

    let swept = 0;
    let deadLettered = 0;

    for (const row of pendingRows) {
      if (row.attempts >= MAX_ATTEMPTS_BEFORE_DEAD_LETTER) {
        await this.eventStore.markDeadLettered(row.eventId);
        deadLettered += 1;
        this.logger.error(
          `Outbox row for event "${row.eventName}" (${row.eventId}) exceeded ${MAX_ATTEMPTS_BEFORE_DEAD_LETTER} attempts; dead-lettered`,
        );
        continue;
      }

      try {
        const event = this.reconstruct(row);
        await this.eventBus.emit(event);

        if (row.eventCategory === 'INTEGRATION') {
          await this.eventPublisher.publish(event);
        }

        await this.eventStore.markPublished(row.eventId);
        swept += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        await this.eventStore.markFailed(row.eventId, message);
        this.logger.warn(
          `Outbox sweep failed for event "${row.eventName}" (${row.eventId}), attempt ${row.attempts + 1}: ${message}`,
        );
      }
    }

    if (swept > 0 || deadLettered > 0) {
      this.logger.log(`Outbox sweep: ${swept} event(s) republished, ${deadLettered} dead-lettered`);
    }

    return { swept, deadLettered };
  }

  private reconstruct(row: {
    eventId: string;
    eventName: string;
    eventVersion: number;
    payload: unknown;
    metadata: unknown;
    tenantId: string | null;
    schoolGroupId: string | null;
    schoolId: string | null;
    campusId: string | null;
    correlationId: string | null;
    traceId: string | null;
    actorId: string | null;
    aggregateId: string | null;
    aggregateType: string | null;
    occurredAt: Date;
  }): IEvent {
    return {
      eventId: row.eventId,
      eventName: row.eventName,
      eventVersion: row.eventVersion,
      occurredAt: row.occurredAt,
      tenantId: row.tenantId ?? undefined,
      schoolGroupId: row.schoolGroupId ?? undefined,
      schoolId: row.schoolId ?? undefined,
      campusId: row.campusId ?? undefined,
      correlationId: row.correlationId ?? undefined,
      traceId: row.traceId ?? undefined,
      actorId: row.actorId ?? undefined,
      aggregateId: row.aggregateId ?? undefined,
      aggregateType: row.aggregateType ?? undefined,
      metadata: row.metadata as Record<string, unknown> | undefined,
      ...(row.payload as Record<string, unknown>),
    };
  }
}
