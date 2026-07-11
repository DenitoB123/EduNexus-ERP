# EduNexus Backend — Milestone 1.7: Final Infrastructure Hardening
### Gap Analysis & Delivery Notes

This package is the result of a real review of Milestones 1.1–1.6 (all five
uploaded zips merged and cross-checked against `app.module.ts`), not a
blind run through the original task brief. Three things came out of that
review that matter more than the new code itself.

---

## 1. What the brief asked for vs. what already existed

| Brief item | Verdict | Notes |
|---|---|---|
| Cache Module | **Built** | New. See §3 for an important caveat. |
| Audit Module | **Already exists** (1.3, `audit-log/`) | Not touched. |
| Event Bus | **Already exists** (1.3, `event-bus/`) | Not touched. New modules subscribe to it. |
| Search Infrastructure | **Already exists** (1.5, `search/`) | Not touched. |
| Notifications Infrastructure | **Already exists** (1.5, `notifications/` + `notification-templates/`) | Not touched. |
| Scheduler | **Built** | New. |
| Configuration | **Already exists** (`config/`, two overlapping implementations — see §2) | Not touched. |
| Logging | **Already exists** (`common/logger/`, two overlapping implementations — see §2) | Not touched. |
| Exception Framework | **Partially existed** | HTTP-layer filters (`AllExceptionsFilter`, `HttpExceptionFilter`, Prisma error mapping) already existed and are solid. What was missing was a **domain/business exception hierarchy** — built as an addition, not a replacement (§4). |
| Validation Framework | **Partially existed** | The global `ValidationPipe` config already existed and is solid. What was missing was **reusable custom field validators** — built as an addition (§4). |
| Rate Limiting | **Already exists** (1.6, `security-hardening/`) | Not touched. |
| Metrics | **Built** | Genuinely missing — no Prometheus anywhere in 1.1–1.6. |
| Database Utilities | **Already exists, extensively** (`database/helpers/` — pagination, cursor pagination, filtering, sorting, query building, tenant-scoped queries, transactions, connection management) | Not touched. This is the most mature part of the existing codebase. |
| Storage Abstraction | **Already exists** (1.6, `file-storage/` + `file/`) | Not touched. |
| Webhooks | **Built** | Genuinely missing (outbound + inbound). |
| Feature Flags | **Built** | Genuinely missing. Includes pilot-school rollout support. |
| Integrations | **Built** | Genuinely missing. M-Pesa + Africa's Talking registered as first providers (Kenya reference market). |
| Quality Assurance | **Built** | Genuinely missing. |

**Net result: 7 new modules, not 17.** Building fresh Cache/Audit/EventBus/
Search/Notifications/RateLimit/Database modules as the brief literally
requested would have duplicated ~60% of the existing codebase — exactly
what "never duplicate existing functionality" was meant to prevent.

---

## 2. Pre-existing drift found during review (not fixed, flagged for a decision)

Three places in the existing codebase have **two different classes with
the same name**, living in different files from different milestones,
where the later milestone's version appears to be the one actually wired
into `app.module.ts` and the earlier one is dead code still sitting on
disk:

1. **`AppConfigService`** — `src/config/config.service.ts` (flat getters:
   `redisHost`, `redisPort`, ...) vs. `src/config/app-config.service.ts`
   (structured getters: `.redis`, `.app`, `.jwt`, ...). Only the first is
   provided by `AppConfigModule` / wired globally.
2. **`AppLoggerService`** — `src/common/logger/logger.service.ts` (Winston,
   `Scope.DEFAULT`, used by `audit-log` and `event-bus`) vs.
   `src/common/logger/app-logger.service.ts` (Winston, `Scope.TRANSIENT`,
   has a `setContext()` method the other doesn't). Only the first is
   provided by `CoreModule` → `LoggerModule`.
3. **As a consequence of #1 and #2**: `src/infrastructure/redis/redis.service.ts`
   and its `RedisModule` are **not imported anywhere in `app.module.ts`**,
   and its constructor asks for the *unwired* `AppConfigService` (with a
   `.redis` getter that only exists on that variant) and the *unwired*
   `AppLoggerService` (with `setContext()`). As written, on disk, today,
   that module cannot bootstrap. There's also a second, separate
   `src/prisma/prisma.service.ts` alongside the one actually used,
   `src/database/prisma.service.ts`.

None of this is fixed in this delivery — fixing it means deciding which
variant of each class is canonical and deleting the other, which is a
call for whoever owns that history, not something to guess at while
building unrelated infrastructure. **It directly affected this milestone
though:** Cache and Scheduler both originally needed Redis, and the
"obvious" choice — reuse the existing `RedisService` — turned out to be
reusing something broken. See §3 for how that was handled.

---

## 3. How Cache and Scheduler get Redis without touching the broken service

`CacheModule` opens its own small, dedicated `ioredis` connection (same
`REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`/`REDIS_DB` env vars `JobsModule`
already reads directly for Bull) and exposes it under the `CACHE_REDIS_CLIENT`
injection token. `SchedulerModule`'s distributed run-lock borrows that same
client rather than opening a third connection. This is **not** a second
parallel cache system being introduced on purpose — it's the smallest
change that avoids both (a) silently patching milestone-1.2 files outside
this milestone's brief, and (b) shipping a module that fails at startup.

Once someone resolves which `AppConfigService`/`AppLoggerService` is
canonical and repairs `RedisService` accordingly, swapping `CacheService`
over to it is a constructor-only change — none of its public API
(`get`/`set`/`del`/`wrap`/`invalidatePattern`/`increment`) needs to change.

---

## 4. Exceptions & Validation — additive, not new frameworks

- `src/exceptions/domain.exception.ts` — `DomainException` base class plus
  `BusinessRuleViolationException`, `ResourceNotFoundException`,
  `TenantIsolationException`, `ConcurrencyConflictException`,
  `FeatureNotAvailableException`, `IntegrationProviderException`. Each
  carries a stable `code`, an HTTP status, and structured `context`.
- `src/exceptions/domain-exception.filter.ts` — catches only
  `DomainException` and maps it onto the same response shape
  `AllExceptionsFilter` already produces. **Register it before**
  `AllExceptionsFilter` in `main.ts`:

  ```ts
  app.useGlobalFilters(
    new DomainExceptionFilter(logger),
    new AllExceptionsFilter(logger),
  );
  ```

  This one line is the only suggested change to `main.ts`, and it's left
  as a suggestion rather than applied directly because `main.ts` already
  registers a third overlapping piece, `GlobalErrorFilter`
  (`src/modules/response/error.filter.ts`, milestone 1.4) — worth resolving
  at the same time as §2, not bolted onto blindly.

- `src/common/validators/` — four reusable `class-validator` decorators:
  `@IsCuid()`, `@IsKenyanPhoneNumber()` (+ `toKenyanMsisdn()` helper),
  `@IsSlug()`, `@IsAfterDate()`. These plug into existing/future DTOs; the
  global `ValidationPipe` config in `common/pipes/validation.pipe.ts` is
  untouched.

---

## 5. New modules — what each one does and how it wires in

| Module | Depends on (existing) | Depends on (new) |
|---|---|---|
| `cache/` | `common/logger` | — |
| `metrics/` | — | — |
| `scheduler/` | `database/prisma.service`, `common/logger`, `event-bus` | `cache/` (Redis lock) |
| `feature-flags/` | `database/prisma.service`, `event-bus`, `audit-log` | `cache/` |
| `integrations/` | `database/prisma.service`, `security` (encryption), `audit-log` | — |
| `webhooks/` | `database/prisma.service`, `event-bus`, `audit-log`, `jobs` (Bull/Redis connection) | `integrations/` (inbound signature verification) |
| `quality-assurance/` | `database/prisma.service`, `common/logger`, `event-bus` | — |

`app.module.ts` in this package is the **full file**, ready to replace the
existing one — Milestone 1.7's imports are added in dependency order; every
1.1–1.6 import/module is untouched.

`prisma/schema.additions.prisma` — append to `prisma/schema.prisma`, run
`npx prisma migrate dev`. New models: `ScheduledTaskRun`,
`WebhookSubscription`, `WebhookDelivery`, `InboundWebhookEvent`,
`FeatureFlag`, `FeatureFlagOverride`, `IntegrationConfig`, `QaCheckRun`.
No existing model touched.

`package.additions.json` — two new dependencies: `@nestjs/schedule`,
`prom-client`.

---

## 6. Deliberately left as TODOs, not guessed at

- **M-Pesa STK Push / Africa's Talking actual HTTP calls** — both provider
  classes implement the full interface and are registered, but the live
  API call is a documented `throw` with a clear message, not a guess at
  credentials, shortcodes, or callback URL structure that would be wrong
  and silently swallowed. `IntegrationConfig` is ready to hold per-school
  credentials (encrypted) the moment those decisions are made.
- **Inbound webhook signature verification** — wired generically by
  provider key through `IntegrationsService.verifyInboundSignature`, but
  defaults closed (`false`) for M-Pesa specifically, since Daraja callbacks
  aren't HMAC-signed the way most webhook providers are (Safaricom expects
  IP allow-listing at the network layer instead) — that's an infra/ingress
  decision, not something to fake in application code.
- **`PerformanceInterceptor` (Milestone 1.6, `observability/`) → Metrics
  wiring** — `MetricsService.observeHttpRequest()` is ready to be called
  from there; not modified directly per "don't touch existing observability
  unless required," since it's a one-line addition best made by whoever
  owns that interceptor.
