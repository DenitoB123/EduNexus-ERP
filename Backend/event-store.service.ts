import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { EventMetadataUtil } from './event-metadata.util';
import { EventReplayGuard } from './event-replay-guard.service';
import { EventDispatcher } from './event-dispatcher.service';
import { EventRegistry } from './event-registry.service';
import {
  EventCategory,
  EventQueryFilter,
  IEvent,
  IEventStore,
  StoredEvent,
} from '../interfaces/event.interface';
import { PrismaTransactionClient } from '../../database/services/transaction.service';

type DomainEventLogRow = {
  id: string;
  eventId: string;
  eventName: string;
  eventVersion: number;
  eventCategory: string;
  priority: string;
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
  status: string;
  attempts: number;
};

type PrismaLike = PrismaService | PrismaTransactionClient;

/**
 * B2.7 — Event Store.
 *
 * Provides: Event Persistence, Replay, Audit History, and Event
 * Versioning (every row records `eventVersion`, so a consumer reading
 * historical events can branch on it if an event's shape changes over
 * time). Backed by the `DomainEventLog` table (see schema.prisma).
 */
@Injectable()
export class EventStoreService implements IEventStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: EventDispatcher,
    private readonly registry: EventRegistry,
    private readonly replayGuard: EventReplayGuard,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('EventStoreService');
  }

  /**
   * Appends an event row. Accepts an optional Prisma transaction client
   * so TransactionalEventPublisher can write the outbox row inside the
   * same transaction as the business change it accompanies.
   */
  async append(
    event: IEvent,
    category: EventCategory,
    status: StoredEvent['status'] = 'PENDING',
    tx?: PrismaTransactionClient,
  ): Promise<StoredEvent> {
    const client: PrismaLike = tx ?? this.prisma;
    const payload = EventMetadataUtil.serialize(event);

    const row = await client.domainEventLog.create({
      data: {
        eventId: event.eventId,
        eventName: event.eventName,
        eventVersion: event.eventVersion ?? 1,
        eventCategory: category,
        priority: (event.priority as string | undefined) ?? 'NORMAL',
        payload,
        metadata: event.metadata as object | undefined,
        tenantId: event.tenantId,
        schoolGroupId: event.schoolGroupId,
        schoolId: event.schoolId,
        campusId: event.campusId,
        correlationId: event.correlationId,
        traceId: event.traceId,
        actorId: event.actorId,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        occurredAt: event.occurredAt,
        status,
      },
    });

    return this.toStoredEvent(row);
  }

  async markPublished(eventId: string): Promise<void> {
    await this.prisma.domainEventLog.updateMany({
      where: { eventId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }

  async markFailed(eventId: string, error: string): Promise<void> {
    await this.prisma.domainEventLog.updateMany({
      where: { eventId },
      data: { status: 'FAILED', lastError: error.slice(0, 2000), attempts: { increment: 1 } },
    });
  }

  async markDeadLettered(eventId: string): Promise<void> {
    await this.prisma.domainEventLog.updateMany({
      where: { eventId },
      data: { status: 'DEAD_LETTERED' },
    });
  }

  /**
   * Idempotent write used by PersistAllEventsSubscriber: if a row for
   * this eventId already exists (e.g. TransactionalEventPublisher
   * already wrote it as PENDING inside the originating transaction),
   * mark it PUBLISHED instead of inserting a duplicate; otherwise
   * insert a fresh row already PUBLISHED, since by the time the
   * broadcast subscriber runs the event has, in fact, been dispatched.
   */
  async upsertPublished(event: IEvent, category: EventCategory): Promise<StoredEvent> {
    const payload = EventMetadataUtil.serialize(event);

    const row = await this.prisma.domainEventLog.upsert({
      where: { eventId: event.eventId },
      update: { status: 'PUBLISHED', publishedAt: new Date() },
      create: {
        eventId: event.eventId,
        eventName: event.eventName,
        eventVersion: event.eventVersion ?? 1,
        eventCategory: category,
        priority: (event.priority as string | undefined) ?? 'NORMAL',
        payload,
        metadata: event.metadata as object | undefined,
        tenantId: event.tenantId,
        schoolGroupId: event.schoolGroupId,
        schoolId: event.schoolId,
        campusId: event.campusId,
        correlationId: event.correlationId,
        traceId: event.traceId,
        actorId: event.actorId,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        occurredAt: event.occurredAt,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    return this.toStoredEvent(row);
  }

  async query(filter: EventQueryFilter): Promise<StoredEvent[]> {
    const rows = await this.prisma.domainEventLog.findMany({
      where: {
        tenantId: filter.tenantId,
        eventName: filter.eventName,
        ...(filter.eventNames ? { eventName: { in: filter.eventNames } } : {}),
        correlationId: filter.correlationId,
        aggregateId: filter.aggregateId,
        status: filter.status,
        occurredAt: {
          gte: filter.occurredAfter,
          lte: filter.occurredBefore,
        },
      },
      orderBy: { occurredAt: 'asc' },
      take: filter.limit ?? 100,
    });

    return rows.map((row: DomainEventLogRow) => this.toStoredEvent(row));
  }

  /**
   * Re-dispatches stored events matching `filter` through the
   * EventDispatcher, one handler at a time, skipping any (eventId,
   * handler) pair EventReplayGuard reports as already processed.
   */
  async replay(filter: EventQueryFilter): Promise<{ replayed: number; skipped: number }> {
    const stored = await this.query(filter);
    let replayed = 0;
    let skipped = 0;

    for (const storedEvent of stored) {
      const handlers = this.registry.getHandlers(storedEvent.eventName);

      for (const handler of handlers) {
        const handlerName = handler.handlerName ?? handler.constructor?.name ?? 'anonymous';
        const claimed = await this.replayGuard.tryClaim(storedEvent.eventId, handlerName);

        if (!claimed) {
          skipped += 1;
          continue;
        }

        try {
          await handler.handle(this.fromStoredEvent(storedEvent));
          replayed += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'unknown error';
          this.logger.error(
            `Replay failed for event "${storedEvent.eventName}" (${storedEvent.eventId}) handler "${handlerName}": ${message}`,
          );
        }
      }
    }

    this.logger.log(
      `Replay complete: ${replayed} handler invocations replayed, ${skipped} skipped`,
    );
    return { replayed, skipped };
  }

  private toStoredEvent(row: DomainEventLogRow): StoredEvent {
    return {
      id: row.id,
      eventId: row.eventId,
      eventName: row.eventName,
      eventVersion: row.eventVersion,
      eventType: row.eventCategory as EventCategory,
      priority: row.priority as StoredEvent['priority'],
      payload: row.payload as Record<string, unknown>,
      metadata: row.metadata as Record<string, unknown> | undefined,
      tenantId: row.tenantId ?? undefined,
      schoolGroupId: row.schoolGroupId ?? undefined,
      schoolId: row.schoolId ?? undefined,
      campusId: row.campusId ?? undefined,
      correlationId: row.correlationId ?? undefined,
      traceId: row.traceId ?? undefined,
      actorId: row.actorId ?? undefined,
      aggregateId: row.aggregateId ?? undefined,
      aggregateType: row.aggregateType ?? undefined,
      occurredAt: row.occurredAt,
      status: row.status as StoredEvent['status'],
      attempts: row.attempts,
    };
  }

  private fromStoredEvent(stored: StoredEvent): IEvent {
    return {
      eventId: stored.eventId,
      eventName: stored.eventName,
      occurredAt: stored.occurredAt,
      tenantId: stored.tenantId,
      schoolGroupId: stored.schoolGroupId,
      schoolId: stored.schoolId,
      campusId: stored.campusId,
      correlationId: stored.correlationId,
      traceId: stored.traceId,
      actorId: stored.actorId,
      aggregateId: stored.aggregateId,
      aggregateType: stored.aggregateType,
      eventVersion: stored.eventVersion,
      metadata: stored.metadata,
      ...stored.payload,
    };
  }
}
