import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';

/**
 * B2.7 — Event Replay Protection.
 *
 * Guarantees a given (eventId, handlerName) pair executes at most
 * once, using the unique constraint on EventProcessingRecord as the
 * source of truth rather than an in-memory set (which wouldn't survive
 * a restart or work across multiple instances of the service).
 *
 * Intentionally NOT wired into the normal in-process dispatch path —
 * a handler invoked once by EventDispatcher during a normal `emit()`
 * has, by definition, been processed exactly once already. This guard
 * exists for the two places where the same event can legitimately be
 * delivered more than once:
 *   1. EventStoreService.replay() — re-dispatching stored events.
 *   2. RabbitMQ consumers for IntegrationEvents, which use at-least-once
 *      delivery semantics (see infrastructure/rabbitmq/consumer.service.ts).
 */
@Injectable()
export class EventReplayGuard {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('EventReplayGuard');
  }

  async hasProcessed(eventId: string, handlerName: string): Promise<boolean> {
    const record = await this.prisma.eventProcessingRecord.findUnique({
      where: { eventId_handlerName: { eventId, handlerName } },
    });
    return record !== null;
  }

  /**
   * Attempts to claim (eventId, handlerName). Returns true if this call
   * claimed it (caller should proceed), false if it was already claimed
   * (caller should skip — this is what makes replay idempotent even
   * under concurrent replay attempts, not just sequential ones).
   */
  async tryClaim(eventId: string, handlerName: string): Promise<boolean> {
    try {
      await this.prisma.eventProcessingRecord.create({
        data: { eventId, handlerName },
      });
      return true;
    } catch (error) {
      // P2002 = unique constraint violation → already claimed by a prior/concurrent attempt.
      const code = (error as { code?: string })?.code;
      if (code === 'P2002') {
        this.logger.debug(`Skipping already-processed event ${eventId} for handler ${handlerName}`);
        return false;
      }
      throw error;
    }
  }
}
