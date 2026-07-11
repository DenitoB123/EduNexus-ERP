# EduNexus Backend — B2.10 Implementation Summary

## Enterprise Notification & Communication Infrastructure

### Status

Built against the real B2.2 cumulative foundation (all 14 uploaded milestone
archives were inspected to establish ground truth). `npx tsc --noEmit` against
the actual B2.2 project, with this module dropped into `src/modules/notification/`
and the schema addition appended, compiles with **zero errors** attributable
to this module (the pre-existing project has ~100 unrelated errors from
missing `@types/amqplib`, `@nestjs/terminus` version drift, and Prisma Client
not being generated in this sandbox — none touch `src/modules/notification`).

This is a **parallel milestone**: it does not assume B2.3–B2.9 are merged,
does not modify any B2.2 file, and reaches every piece of foundation
infrastructure (Prisma, EventBus, JobQueue/RabbitMQ, RBAC guards, logger,
tenancy) exclusively via existing public APIs or new DI tokens.

---

## 1. Important discovery: reused vs. new infrastructure

B2.2 already ships low-level channel transport under `infrastructure/`:
`EmailService`/`EmailFactory`, `SmsService`/`SmsFactory`,
`PushService`/`PushFactory`/`DeviceRegistrationService`, all wired through
`JobModule`'s RabbitMQ pipeline (`amqplib`, not BullMQ/Redis — the actual
queue backend). Per the instruction *"Reference them through interfaces and
dependency injection. Do NOT regenerate them,"* this module's
`providers/email.provider.ts`, `sms.provider.ts`, `push.provider.ts` are thin
adapters over those existing services, not new SMTP/SMS-gateway/FCM clients.

Two genuinely new capabilities were added because the foundation has no
equivalent: **IN_APP** (the persisted `Notification` row itself) and
**WEBSOCKET** (new `NotificationGateway`, requires new dependencies —
see §5).

---

## 2. Folder Structure

```
src/modules/notification/
├── notification.module.ts
├── notification.service.ts       # create, broadcast, retry, cancel, history, mark read/opened/clicked/delivered
├── notification.controller.ts    # REST surface, RolesGuard+PermissionsGuard
├── providers/
│   ├── email.provider.ts         # adapts infrastructure/email EmailService
│   ├── sms.provider.ts           # adapts infrastructure/sms SmsService
│   ├── push.provider.ts          # adapts infrastructure/push PushService
│   ├── inapp.provider.ts         # no-op transport; the DB row IS the notification
│   └── websocket.provider.ts     # pushes via NotificationGateway
├── channels/
│   ├── channel.factory.ts        # NOTIFICATION_CHANNEL_PROVIDERS registry
│   ├── channel.service.ts        # per-notification dispatch orchestration
│   ├── recipient-directory.default.ts  # NullRecipientDirectory (see §4)
│   └── recipient-resolvers.ts    # USER, CUSTOM_GROUP + inert org-target resolvers
├── templates/
│   ├── template.renderer.ts      # {{variable}} interpolation, dependency-free
│   └── template.service.ts       # CRUD + locale-fallback render resolution
├── preferences/
│   └── preference.service.ts     # get/update, quiet hours, category mute/override logic
├── gateway/
│   └── notification.gateway.ts   # Socket.IO gateway, JWT-verified on connect
├── jobs/
│   └── send-notification.job-handler.ts  # registers with existing JobRegistry/RabbitMQ retry
├── events/
│   └── notification.events.ts    # 10 DomainEvent subclasses on the existing EventBus
├── repositories/
│   ├── notification.repository.ts
│   ├── notification-template.repository.ts
│   └── notification-preference.repository.ts   # all extend SoftDeleteRepository<T>
├── dto/                          # create, broadcast, update-preference, query (class-validator)
├── interfaces/                   # entity shapes, channel provider contract, recipient directory contract
└── constants/notification.constants.ts

prisma/
├── notification-schema-addition.prisma           # 3 models + 3 enums, NOT yet in schema.prisma
├── migrations/20260702120000_add_notification_infrastructure/migration.sql
└── notification-migration-standalone.sql          # same SQL, flat file
```

---

## 2a. Features delivered against the B2.10 spec

- **Notification service** — create, queue (auto, via `JobQueueService.enqueue`),
  retry (`FAILED` → `PENDING` → re-queued), cancel (blocks once `SENT`),
  paginated history with filters.
- **Channels** — EMAIL, SMS, PUSH, IN_APP, WEBSOCKET, each behind
  `INotificationChannelProvider`; adding a channel = one new class + one line
  in `notification.module.ts`.
- **Templates** — HTML + plain-text bodies, `{{var}}` and `{{nested.path}}`
  substitution, per-(code, channel, locale) storage with fallback to `en`.
- **Preferences** — per-channel toggles, quiet hours (timezone-aware, handles
  overnight windows), category mute list, per-category channel overrides.
  `EMERGENCY` category always bypasses mute/quiet-hours by design.
- **Categories** — all 10 requested, as a shared enum + Prisma enum.
- **Delivery tracking** — all 9 requested statuses on the `Notification` row
  with corresponding timestamp columns; `SendNotificationJobHandler` writes
  `SENT`/`FAILED`, controller endpoints write `DELIVERED`/`READ`/`OPENED`/`CLICKED`.
- **Bulk messaging** — `POST /notifications/broadcast` resolves a target via
  the `RECIPIENT_RESOLVERS` registry and fans out one `Notification` row per
  recipient sharing a `batchId`. USER and CUSTOM_GROUP (explicit user-id list)
  are implemented; CLASS/DEPARTMENT/CAMPUS/INSTITUTION are registered but
  throw `NotImplementedException` — see §4.

---

## 3. Integration points (foundation APIs consumed, unmodified)

| Foundation service | Used for |
|---|---|
| `PrismaService` (`src/prisma`) | Repository delegates (`prisma.notification`, etc.) |
| `SoftDeleteRepository<T>` / `AuditableRepository` / `TenantRepository` (`common/repositories`) | All 3 repositories extend `SoftDeleteRepository` — tenant scoping, soft delete, and `createdBy`/`updatedBy` actor stamping come for free |
| `EventBus.emit()` (`infrastructure/events`) | 10 lifecycle `DomainEvent`s |
| `JobQueueService.enqueue()` / `JobRegistry.register()` / `JobHandlerBase` (`infrastructure/jobs`) | Async dispatch + retry via the existing RabbitMQ consumer's `MessageRetryStrategy` — no new queue infra |
| `EmailService` / `SmsService` / `PushService` (`infrastructure/{email,sms,push}`) | Actual channel transport |
| `RolesGuard` / `PermissionsGuard` / `@RequirePermissions` (`common/guards`, `common/decorators`) | Route authorization (currently log-and-allow pending the Auth module, per those guards' own documented behavior) |
| `JwtAuthGuard` (global `APP_GUARD` in `app.module.ts`) | Already protects these routes; not re-declared |
| `CurrentUser` / `CurrentTenant` (`common/decorators`) | Actor/tenant extraction |
| `AppLoggerService`, `AppConfigService` | Logging, JWT secret for the gateway |

**Module registration required at merge time:** add `NotificationModule` to
`AppModule.imports` in `app.module.ts`. Nothing else in the foundation needs
to change.

---

## 4. Explicit extension points (by design, not gaps)

1. **`RECIPIENT_DIRECTORY` (contact-info lookup)** — no Users/Auth module
   exists yet in this foundation (documented in `JwtAuthGuard` and
   `RolesGuard` themselves). `NullRecipientDirectory` is bound by default and
   logs a warning; EMAIL/SMS/PUSH require either a future Users module
   rebinding this token, or an explicit `data.contactOverride: { email, phone }`
   on the notification payload. IN_APP/WEBSOCKET are unaffected (userId only).
2. **`RECIPIENT_RESOLVERS` for CLASS/DEPARTMENT/CAMPUS/INSTITUTION** — bound
   to `UnresolvedOrgRecipientResolver`, which throws a clear
   `NotImplementedException`. A future Academic/Org-structure module
   registers real resolvers against the same token. USER and CUSTOM_GROUP
   work today.
3. **Deferred quiet-hours redelivery** — a notification suppressed for
   EMAIL/SMS/PUSH during quiet hours stays `PENDING`/skipped rather than
   being rescheduled; a follow-up scheduled job (using the existing
   `infrastructure/scheduler`) is the natural place to add "redeliver once
   quiet hours end," intentionally left out of this milestone's scope.
4. **Delivery webhooks** — `markDelivered()` exists but nothing calls it yet;
   wiring provider delivery/bounce webhooks to it is per-provider and out of
   scope here.

---

## 5. New dependencies required at merge time

None of EMAIL/SMS/PUSH need new packages (they reuse B2.2's `EmailFactory`
etc.). WEBSOCKET is new capability and needs:

```
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

(Installed and verified in this sandbox with `--legacy-peer-deps` against the
project's NestJS 10.4.15 — `@nestjs/websockets`/`@nestjs/platform-socket.io`
had no `10.x`-pinned range published at install time; re-check for an exact
match at merge time.)

---

## 6. Auditing

No dedicated `AuditService` exists in the foundation (only
`security-audit.logger` for security events, and `AuditableRepository`'s
automatic `createdBy`/`updatedBy` stamping). Rather than fabricate an audit
service, this module's audit trail is:
- automatic actor stamping on every `Notification`/`Template`/`Preference`
  write (inherited from `AuditableRepository`), and
- full domain-event emission (`NotificationCreatedEvent`, `...SentEvent`,
  `...FailedEvent`, `...PreferenceUpdatedEvent`, etc.) on every lifecycle
  transition, which a future Audit module can subscribe to via `EventBus`.

---

## 7. Prisma schema — action required at B2.21

`prisma/notification-schema-addition.prisma` is **not** appended to the live
`prisma/schema.prisma` in this deliverable (per the parallel-milestone rule:
don't touch shared foundation files). It adds 3 models
(`Notification`, `NotificationTemplate`, `NotificationPreference`) and 3
enums (`NotificationChannel`, `NotificationCategory`, `DeliveryStatus`),
following the mandatory base-field convention verbatim. At B2.21, append its
contents (after the header comment) to `schema.prisma` and run
`prisma migrate dev`, or apply `migration.sql`/`notification-migration-standalone.sql`
directly.

Note: `prisma generate` could not be run to completion in this sandbox
(`binaries.prisma.sh` is outside the allowed network egress list here), so
the schema/migration SQL pairing was hand-verified for consistency with the
base-field convention rather than machine-generated.
