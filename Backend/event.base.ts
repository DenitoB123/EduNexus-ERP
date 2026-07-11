import { randomUUID } from 'crypto';
import { EventPriority, IEvent } from '../interfaces/event.interface';

/**
 * B2.7 — common optional metadata every event flavor accepts, appended
 * as the last constructor parameter of each class below so nothing that
 * already calls `new DomainEvent('x.y')` or `new IntegrationEvent('x.y', 'src')`
 * (B1.3/B2.1) needs to change.
 */
export interface EventBaseOptions {
  eventVersion?: number;
  priority?: EventPriority;
  tenantId?: string;
  schoolGroupId?: string;
  schoolId?: string;
  campusId?: string;
  correlationId?: string;
  traceId?: string;
  actorId?: string;
  aggregateId?: string;
  aggregateType?: string;
  metadata?: Record<string, unknown>;
}

/** Shared field-assignment so every event flavor stays in sync without duplicating the constructor body. */
function applyBaseOptions(target: Partial<EventBaseOptions>, options?: EventBaseOptions): void {
  target.eventVersion = options?.eventVersion ?? 1;
  target.priority = options?.priority ?? EventPriority.NORMAL;
  target.tenantId = options?.tenantId;
  target.schoolGroupId = options?.schoolGroupId;
  target.schoolId = options?.schoolId;
  target.campusId = options?.campusId;
  target.correlationId = options?.correlationId;
  target.traceId = options?.traceId;
  target.actorId = options?.actorId;
  target.aggregateId = options?.aggregateId;
  target.aggregateType = options?.aggregateType;
  target.metadata = options?.metadata;
}

export abstract class DomainEvent implements IEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  tenantId?: string;
  schoolGroupId?: string;
  schoolId?: string;
  campusId?: string;
  correlationId?: string;
  eventVersion?: number;
  priority?: EventPriority;
  actorId?: string;
  traceId?: string;
  aggregateId?: string;
  aggregateType?: string;
  metadata?: Record<string, unknown>;

  constructor(
    public readonly eventName: string,
    options?: EventBaseOptions,
  ) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
    applyBaseOptions(this, options);
  }
}

export abstract class IntegrationEvent implements IEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  tenantId?: string;
  schoolGroupId?: string;
  schoolId?: string;
  campusId?: string;
  correlationId?: string;
  eventVersion?: number;
  priority?: EventPriority;
  actorId?: string;
  traceId?: string;
  aggregateId?: string;
  aggregateType?: string;
  metadata?: Record<string, unknown>;

  constructor(
    public readonly eventName: string,
    public readonly source: string,
    options?: EventBaseOptions,
  ) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
    applyBaseOptions(this, options);
  }
}

/**
 * B2.7 — Application-level events: things that happened in the
 * application layer that aren't necessarily tied to a single aggregate
 * (session lifecycle, feature usage) but still matter to other modules.
 * e.g. UserLoggedInEvent, UserLoggedOutEvent.
 */
export abstract class ApplicationEvent implements IEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  tenantId?: string;
  schoolGroupId?: string;
  schoolId?: string;
  campusId?: string;
  correlationId?: string;
  eventVersion?: number;
  priority?: EventPriority;
  actorId?: string;
  traceId?: string;
  aggregateId?: string;
  aggregateType?: string;
  metadata?: Record<string, unknown>;

  constructor(
    public readonly eventName: string,
    options?: EventBaseOptions,
  ) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
    applyBaseOptions(this, options);
  }
}

/**
 * B2.7 — Notification-intent events. Carries channel + recipient +
 * content so NotificationDispatchHandler can route to Email/SMS/Push/
 * in-app without the publishing module depending on any of those
 * infrastructure modules directly.
 */
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in-app';

export interface NotificationEventPayload {
  channel: NotificationChannel;
  recipient: string | string[];
  title?: string;
  body: string;
  templateKey?: string;
  templateContext?: Record<string, unknown>;
  data?: Record<string, string>;
}

export abstract class NotificationEvent implements IEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  tenantId?: string;
  schoolGroupId?: string;
  schoolId?: string;
  campusId?: string;
  correlationId?: string;
  eventVersion?: number;
  priority?: EventPriority;
  actorId?: string;
  traceId?: string;
  aggregateId?: string;
  aggregateType?: string;
  metadata?: Record<string, unknown>;

  constructor(
    public readonly eventName: string,
    public readonly payload: NotificationEventPayload,
    options?: EventBaseOptions,
  ) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
    applyBaseOptions(this, options);
  }
}

/**
 * B2.7 — Audit events. Raised for CRUD operations, authentication
 * events, configuration changes, and permission changes so a single
 * AuditEventHandler (persisting to the EventStore) captures an audit
 * trail without every module writing its own audit-log code.
 */
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'RESTORE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PERMISSION_CHANGE'
  | 'ROLE_ASSIGNMENT'
  | 'CONFIG_CHANGE'
  | 'ACCESS_DENIED';

export interface AuditEventPayload {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
}

export abstract class AuditEvent implements IEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  tenantId?: string;
  schoolGroupId?: string;
  schoolId?: string;
  campusId?: string;
  correlationId?: string;
  eventVersion?: number;
  priority?: EventPriority;
  actorId?: string;
  traceId?: string;
  aggregateId?: string;
  aggregateType?: string;
  metadata?: Record<string, unknown>;

  constructor(
    public readonly eventName: string,
    public readonly payload: AuditEventPayload,
    options?: EventBaseOptions,
  ) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
    applyBaseOptions(this, options);
  }
}

/**
 * B2.7 — System-level events: platform/infrastructure occurrences not
 * scoped to a single tenant action (tenant provisioning, background job
 * lifecycle, system health transitions).
 */
export abstract class SystemEvent implements IEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  tenantId?: string;
  schoolGroupId?: string;
  schoolId?: string;
  campusId?: string;
  correlationId?: string;
  eventVersion?: number;
  priority?: EventPriority;
  actorId?: string;
  traceId?: string;
  aggregateId?: string;
  aggregateType?: string;
  metadata?: Record<string, unknown>;

  constructor(
    public readonly eventName: string,
    options?: EventBaseOptions,
  ) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
    applyBaseOptions(this, options);
  }
}

/** B2.7 — spec-requested alias. All six event flavors above satisfy this shape; kept as a type, not a class, so it doesn't create a second inheritance root. */
export type BaseDomainEvent =
  DomainEvent | IntegrationEvent | ApplicationEvent | NotificationEvent | AuditEvent | SystemEvent;
