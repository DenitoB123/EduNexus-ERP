import { IEvent } from '../../../infrastructure/interfaces/event.interface';

/**
 * Marker interface for a read model / view model / DTO projection.
 * Intentionally minimal (id + tenant scoping + a freshness marker) —
 * concrete read models are defined by business modules (B3+), which
 * decide their own persistence (a Prisma read-model table, a cached
 * blob, etc). This infra only standardizes the shape they identify
 * themselves with.
 */
export interface IReadModel {
  readonly id: string;
  readonly tenantId: string;
  readonly projectedAt: Date;
  readonly sourceEventId: string;
}

/**
 * A projection updates one read model in response to one domain/
 * integration event. Implemented as an event handler so it plugs into
 * the *existing* EventBus (infrastructure/events, B1.3) via the
 * existing `@OnEvent` decorator/`EventSubscriberExplorer` — B2.8 does
 * not introduce a second event subscription mechanism. See
 * `ProjectionHandlerBase` for the concrete base class.
 */
export interface IProjection<TEvent extends IEvent = IEvent> {
  readonly eventName: string;
  project(event: TEvent): Promise<void>;
}
