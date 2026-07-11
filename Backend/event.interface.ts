/**
 * B2.7 — Event Priorities.
 *
 * Informs dispatch ordering (see EventDispatcher): CRITICAL/HIGH priority
 * events run their handlers sequentially in priority order so a failure
 * or slow handler cannot silently race with the rest; NORMAL/LOW continue
 * to run handlers concurrently (unchanged B1.3 behavior).
 */
export enum EventPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/** B2.7 — which EventStore-persisted category an event belongs to. */
export enum EventCategory {
  DOMAIN = 'DOMAIN',
  INTEGRATION = 'INTEGRATION',
  APPLICATION = 'APPLICATION',
  NOTIFICATION = 'NOTIFICATION',
  AUDIT = 'AUDIT',
  SYSTEM = 'SYSTEM',
}

export interface IEvent {
  eventId: string;
  eventName: string;
  occurredAt: Date;
  tenantId?: string;
  schoolGroupId?: string;
  schoolId?: string;
  campusId?: string;
  correlationId?: string;
  /** B2.7 — added additively; existing events default to '1' via EventBase. */
  eventVersion?: number;
  priority?: EventPriority;
  actorId?: string;
  traceId?: string;
  aggregateId?: string;
  aggregateType?: string;
  metadata?: Record<string, unknown>;
}

export interface IEventHandler<T extends IEvent = IEvent> {
  handle(event: T): Promise<void>;
  /** Optional explicit name for replay-protection bookkeeping; defaults to constructor name. */
  readonly handlerName?: string;
  /** Optional ordering hint among handlers of the same event (higher runs first). Default 0. */
  readonly priority?: number;
}

export type EventMiddlewareFn = (event: IEvent, next: () => Promise<void>) => Promise<void>;

/**
 * B2.7 — Enterprise Event Bus supporting infrastructure interfaces.
 * Additive: does not replace or narrow anything B1.3 already exposed
 * concretely on EventBus/EventDispatcher/EventPublisher; these describe
 * the contract those classes now fulfill so future modules can depend
 * on interfaces rather than concrete infrastructure classes.
 */
export interface IEventPublisher {
  publish(event: IEvent): Promise<void>;
}

export interface IEventSubscriber {
  subscribe<T extends IEvent>(eventName: string, handler: IEventHandler<T>): void;
  unsubscribe?(eventName: string, handler: IEventHandler): void;
}

export interface IEventDispatcher {
  dispatch(event: IEvent): Promise<void>;
}

export interface StoredEvent extends IEvent {
  /** Store row id (distinct from eventId, which is the domain-level identifier). */
  id: string;
  eventType: EventCategory;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED' | 'DEAD_LETTERED';
  attempts: number;
}

export interface EventQueryFilter {
  tenantId?: string;
  eventName?: string;
  eventNames?: string[];
  correlationId?: string;
  aggregateId?: string;
  status?: StoredEvent['status'];
  occurredAfter?: Date;
  occurredBefore?: Date;
  limit?: number;
}

export interface IEventStore {
  append(event: IEvent, category: EventCategory, status?: StoredEvent['status']): Promise<StoredEvent>;
  markPublished(eventId: string): Promise<void>;
  markFailed(eventId: string, error: string): Promise<void>;
  query(filter: EventQueryFilter): Promise<StoredEvent[]>;
  /**
   * Re-dispatches previously stored events matching the filter through the
   * EventDispatcher, guarded by EventReplayGuard so already-processed
   * (eventId, handler) pairs are skipped rather than re-run.
   */
  replay(filter: EventQueryFilter): Promise<{ replayed: number; skipped: number }>;
}
