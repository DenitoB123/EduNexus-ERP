# IMPLEMENTATION SUMMARY — B2.7: Domain Events, Event Bus & Event-Driven Architecture

## Scope note — please read first

The brief for B2.7 assumes B2.1–B2.6 are already complete. The codebase actually
supplied in this upload set only reaches **B2.1 (DDD base classes) + B2.2 (Generic
Repository & Data Access Layer)** — I could not find B2.3, B2.4, B2.5, or B2.6
anywhere in the uploaded archives. Rather than inventing that intervening work, this
milestone was built directly on top of the actual latest state (B2.2), extending the
event-bus skeleton that already existed from **B1.3**. If B2.3–B2.6 exist in a
session/export I don't have, they should merge in cleanly — nothing here depends on
business modules that don't exist yet.

## What already existed (B1.3) and was extended, not replaced

`src/infrastructure/events/` already had a working skeleton: `EventBus`,
`EventDispatcher`, `EventRegistry`, `EventMiddlewareChain` (with a logging
middleware), `EventPublisher` (RabbitMQ), `EventSubscriberExplorer`
(`@OnEvent` discovery via `DiscoveryService`), and `DomainEvent` /
`IntegrationEvent` base classes. B2.1 already re-exported `DomainEvent` for
`AggregateRoot` to raise events against. None of that was duplicated — every
file below is either new or an additive edit to one of those.

## Files created

**Event base classes & standard events**
- `event.base.ts` *(extended)* — added `ApplicationEvent`, `NotificationEvent`, `AuditEvent`, `SystemEvent`, shared `EventBaseOptions`, and a `BaseDomainEvent` union type. `DomainEvent`/`IntegrationEvent` constructors gained an optional trailing options param (backward compatible).
- `standard-events/entity-lifecycle.events.ts` — `EntityCreatedEvent<T>`, `EntityUpdatedEvent<T>`, `EntityDeletedEvent`, `EntityRestoredEvent`
- `standard-events/session-and-security.events.ts` — `UserLoggedInEvent`, `UserLoggedOutEvent`, `PermissionChangedEvent`, `RoleAssignedEvent`
- `standard-events/tenant-and-notification.events.ts` — `TenantCreatedEvent`, `NotificationRequestedEvent`, `NotificationSentEvent`
- `standard-events/index.ts` — barrel export

**Event bus core (extended)**
- `event-bus.service.ts` *(rewritten)* — stamps tenant/actor/correlation/trace context from `TenantContextService` before dispatch; added `emitMany`, `subscribeGlobal`, `unsubscribe`
- `event-dispatcher.service.ts` *(rewritten)* — runs global (broadcast) handlers + named handlers; CRITICAL/HIGH priority events run handlers sequentially in priority order, NORMAL/LOW stay concurrent; per-handler retry with backoff via the existing `MessageRetryStrategy`
- `event-registry.service.ts` *(extended)* — added `registerGlobal`/`getGlobalHandlers` (broadcast) and priority-based handler ordering
- `event-publisher.service.ts` *(extended)* — now implements `IEventPublisher`

**Event Store, replay, and idempotency**
- `event-store.service.ts` — `append`, `upsertPublished`, `markPublished`, `markFailed`, `markDeadLettered`, `query`, `replay` against the new `DomainEventLog` table
- `event-replay-guard.service.ts` — DB-unique-constraint-backed idempotency (`EventProcessingRecord`), used by replay and available to RabbitMQ consumers
- `event-metadata.util.ts` — context enrichment, JSON-safe serialization, structural validation, correlation/trace helpers

**Middleware**
- `middlewares/auth-context.middleware.ts`, `tenant-resolution.middleware.ts` (incl. cross-tenant leakage guard), `validation.middleware.ts`, `performance-monitoring.middleware.ts`
- `event-middleware.registrar.ts` — wires the four onto the existing `EventMiddlewareChain` at bootstrap

**Notification & audit integration**
- `notification-dispatch.handler.ts` — routes `notification.requested` to the existing `EmailQueueService` / `SmsQueueService` / `NotificationQueueService` (push) / a Redis-backed in-app list, then raises `NotificationSentEvent`
- `audit-event.publisher.ts` — `AuditEventPublisher` facade (`recordCrud`, `recordAuth`, `recordConfigChange`, `recordPermissionChange`)
- `persist-all-events.subscriber.ts` — global handler that persists **every** dispatched event to the Event Store; this is what gives every future module audit history "for free"
- `event-handler.registrar.ts` — wires the two class-based handlers above onto the bus at bootstrap (handlers using `@OnEvent` still auto-register via the existing `EventSubscriberExplorer`)

**Transaction integration**
- `transactional-event.publisher.ts` — outbox pattern: `stage(tx, events)` writes PENDING rows inside the caller's Prisma transaction; `flush(events)` runs after commit and dispatches via `EventBus` (+ `EventPublisher` for `IntegrationEvent`s)
- `event-outbox-processor.service.ts` — minute-cron safety net that republishes any PENDING row still stale after 30s (crash recovery), dead-lettering after 5 failed attempts

**Interfaces & schema**
- `infrastructure/interfaces/event.interface.ts` *(extended)* — `EventPriority`, `EventCategory`, `IEventPublisher`, `IEventSubscriber`, `IEventDispatcher`, `IEventStore`, `StoredEvent`, `EventQueryFilter`; `IEvent`/`IEventHandler` gained optional fields (all additive)
- `prisma/schema.prisma` *(extended)* — `DomainEventLog` (the event store / outbox table) and `EventProcessingRecord` (replay-protection ledger), plus `EventCategory`/`EventPriority`/`EventProcessingStatus` enums

**Module wiring**
- `event.module.ts` *(rewritten)* — registers every provider above; still `@Global()`, still one `EventModule`

## Bug found and fixed (pre-existing, not B2.7 scope)
`src/common/logger/app-logger.service.ts` imported `AppConfigService` via
`'../config/app-config.service'`, which is one directory level short (the file
is nested at `src/common/logger/`, so it needs `'../../config/app-config.service'`).
This silently broke every test that constructs `AppLoggerService`. Fixed as a
one-line change since it was blocking verification of this milestone's own tests.

## Verification performed
- `npm install` succeeded (973 packages)
- `npx tsc --noEmit -p tsconfig.json`: **zero errors** anywhere under `src/infrastructure/events/`. (`npx prisma generate` could not run in this sandbox — `binaries.prisma.sh` isn't on the allowed network list — so `PrismaService`'s `domainEventLog` / `eventProcessingRecord` delegates aren't typed yet in this environment; that resolves itself the moment `prisma generate` runs somewhere with normal network access. Everything else, including all other pre-existing errors in the wider codebase, is unrelated to this milestone.)
- `npx eslint src/infrastructure/events --ext .ts`: clean after `--fix` (all findings were Prettier formatting, no logic issues)
- `npx jest src/infrastructure/events`: **5/5 passing**, including a fake-timer test of the new retry path and a new test asserting tenant/actor/correlation context gets stamped onto events automatically

## Before this is usable end-to-end
1. `npx prisma generate` (needs real network access to Prisma's engine CDN)
2. `npx prisma migrate dev --name add_event_store` to create `domain_event_log` and `event_processing_record` tables
3. Nothing else — `EventModule` is already `@Global()` and already imported once in `AppModule`; no other wiring is required

## What every future business module (B3+) now gets automatically
- Raise any event via `EventBus.emit()` (or `AggregateRoot.addDomainEvent` + a `TransactionalEventPublisher.stage/flush` pair for events tied to a DB write) → it's persisted, tenant-scoped, validated, timed, and audited without writing any of that code per-module
- Request a notification via `NotificationRequestedEvent` → delivered on the right channel without importing Email/SMS/Push modules
- Record an audit trail entry via `AuditEventPublisher` → lands in the same Event Store as everything else
- Replay any slice of event history via `EventStoreService.replay(filter)`, safely, even if some of it was already processed
