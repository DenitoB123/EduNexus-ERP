import { randomUUID } from 'crypto';
import { IEvent } from '../interfaces/event.interface';
import { TenantContextService } from '../../database/context/tenant-context.service';

/**
 * B2.7 — Shared Utilities: Event Serialization, Event Metadata,
 * Correlation IDs, Trace IDs, Event Context, Event Validation.
 */
export class EventMetadataUtil {
  /**
   * Fills in tenantId/correlationId/actorId/traceId from the current
   * request's AsyncLocalStorage context (TenantContextService, B1.2)
   * for any of those fields the event didn't already set explicitly.
   * Explicit values on the event always win — this only fills gaps.
   */
  static enrichFromContext(event: IEvent, tenantContext: TenantContextService): IEvent {
    const context = tenantContext.getContext();
    if (!context) return event;

    event.tenantId ??= context.tenantId;
    event.schoolGroupId ??= context.schoolGroupId;
    event.schoolId ??= context.schoolId;
    event.campusId ??= context.campusId;
    event.actorId ??= context.actorId;
    event.correlationId ??= context.correlationId;
    event.traceId ??= event.correlationId ?? randomUUID();

    return event;
  }

  /** JSON-safe serialization for EventStore persistence / RabbitMQ transport. */
  static serialize(event: IEvent): Record<string, unknown> {
    return JSON.parse(
      JSON.stringify(event, (_key, value: unknown) =>
        value instanceof Date ? value.toISOString() : value,
      ),
    ) as Record<string, unknown>;
  }

  /** Minimal structural validation prior to dispatch/persistence. */
  static validate(event: IEvent): string[] {
    const errors: string[] = [];

    if (!event.eventId) errors.push('eventId is required');
    if (!event.eventName) errors.push('eventName is required');
    if (!event.occurredAt) errors.push('occurredAt is required');
    if (event.eventName && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(event.eventName)) {
      errors.push(`eventName "${event.eventName}" should follow "domain.action" dot-notation`);
    }

    return errors;
  }

  static isValid(event: IEvent): boolean {
    return this.validate(event).length === 0;
  }

  /** Builds a fresh correlation/trace pair for events originated outside an HTTP request (jobs, seeds, replay). */
  static newContext(): { correlationId: string; traceId: string } {
    const correlationId = randomUUID();
    return { correlationId, traceId: correlationId };
  }
}
