import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';

// ─────────────────────────────────────────────────────────────────────────────
// Canonical event names — the contract other modules subscribe against.
// Add to this list as new domain events are introduced; do not invent
// ad-hoc string literals at call sites.
// ─────────────────────────────────────────────────────────────────────────────
export const SYSTEM_EVENTS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  STUDENT_REGISTERED: 'student.registered',
  PAYMENT_COMPLETED: 'payment.completed',
  AUDIT_TRIGGERED: 'audit.triggered',
  FILE_UPLOADED: 'file.uploaded',
  SETTING_CHANGED: 'setting.changed',
} as const;

export type SystemEventName = (typeof SYSTEM_EVENTS)[keyof typeof SYSTEM_EVENTS];

export interface DomainEvent<TPayload = Record<string, unknown>> {
  name: string;
  payload: TPayload;
  schoolId?: string | null;
}

/**
 * EventBusService
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin, typed wrapper over EventEmitter2 (in-process pub/sub) that also
 * persists every published event to SystemEvent. The persisted row is what
 * lets this module act as a seed for a future message-broker / microservices
 * split: the in-process emitter is the transport today, SystemEvent is the
 * durable log that a future outbox-relay can replay onto Kafka/SQS/etc.
 *
 * Modules should depend on EventBusService, not EventEmitter2 directly, so
 * the transport can be swapped later without touching call sites.
 */
@Injectable()
export class EventBusService {
  constructor(
    private readonly emitter: EventEmitter2,
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Publishes an event to all in-process subscribers and persists it.
   * Persistence failures are logged, never thrown — a broken event log
   * must not block the publishing call site.
   */
  async publish<TPayload extends Record<string, unknown>>(
    event: DomainEvent<TPayload>,
  ): Promise<void> {
    let recordId: string | undefined;

    try {
      const record = await this.prisma.systemEvent.create({
        data: {
          name: event.name,
          payload: event.payload,
          schoolId: event.schoolId ?? null,
          status: 'PENDING',
        },
      });
      recordId = record.id;
    } catch (error) {
      this.logger.error(
        `Failed to persist event '${event.name}'`,
        (error as Error)?.stack,
        'EventBusService',
      );
    }

    try {
      this.emitter.emit(event.name, event.payload);
      if (recordId) {
        await this.prisma.systemEvent
          .update({
            where: { id: recordId },
            data: { status: 'PUBLISHED', publishedAt: new Date() },
          })
          .catch(() => undefined);
      }
    } catch (error) {
      this.logger.error(
        `Subscriber threw while handling event '${event.name}'`,
        (error as Error)?.stack,
        'EventBusService',
      );
      if (recordId) {
        await this.prisma.systemEvent
          .update({
            where: { id: recordId },
            data: { status: 'FAILED', error: (error as Error)?.message },
          })
          .catch(() => undefined);
      }
    }
  }

  /** Subscribe programmatically (prefer the @OnEvent() decorator in listener classes where possible). */
  subscribe<TPayload = Record<string, unknown>>(
    eventName: string,
    handler: (payload: TPayload) => void | Promise<void>,
  ): void {
    this.emitter.on(eventName, handler);
  }

  unsubscribe(eventName: string, handler: (...args: unknown[]) => void): void {
    this.emitter.off(eventName, handler);
  }
}

// Re-export so listener classes can `import { OnEvent } from '../event-bus/event-bus.service'`
// and keep all event-bus-related imports in one place.
export { OnEvent };
