# IMPLEMENTATION SUMMARY — B2.13: Enterprise Audit, Activity Logging & Compliance Framework

## Base and what was actually verified before writing code

Built on the **B2_11 snapshot** from your uploads — the most recent *full cumulative tree*
among B1.1–B2.12. Several of the other uploads (B2_3, B2_3_Merged, B2_4, B2_10, B2_12) are
incremental delta zips layered on top of a full snapshot rather than refreshed full snapshots
themselves, and B2_6/B2_7/B2_7_A/B2_8/B2_9 turned out to belong to a **different, incompatible
folder-structure lineage** than B2_11 (different `common/` organization entirely — checked by
grepping both for `authorization`/`cqrs`/`jobs`/`notification`/`mapping` module markers). Rather
than attempting a risky reconciliation of incompatible lineages under this milestone's own time
budget, B2.13 extends B2_11 directly, since it's the most complete, internally consistent
snapshot with all the infrastructure this framework actually needs already present and working.

**A real, pre-existing `AuditLog`/`AuditLogService` was found in B1.3** (Sequelize-era, then a
simpler NestJS version) but is **not present in B2_11's current schema** — it was dropped
somewhere between B1.3 and B2_11, not merged forward. `AuditEvent` below is a superset of that
shape, field-compatible where the concepts line up, not a from-scratch reinvention. This is
stated plainly rather than silently resurrecting old code as if it were still there.

## Existing infrastructure reused, not duplicated

This required real investigation, not assumption — each of these was opened and read before
deciding to reuse it:

| Concern | Existing component | What B2.13 does instead of rebuilding it |
|---|---|---|
| Correlation ID generation | `CorrelationIdUtil` (infrastructure/monitoring) | Read directly from `x-correlation-id`, already set by `LoggingInterceptor` before `AuditInterceptor` runs |
| Per-request context | `RequestContextService`, `TenantContextService` | `AuditContextResolver` reads `request.tenantContext`/`request.authContext`, the same sources every other interceptor uses |
| Security event logging | `SecurityAuditLogger`/`SuspiciousActivityLogger` (security/monitoring) | `AuditAlertService` calls into `SecurityAuditLogger.log()` for security-relevant alerts rather than reimplementing SQL-injection/rate-limit detection |
| Repository pattern | **Two parallel hierarchies exist in B2_11** — `common/base/BaseRepository` (no real business usage) and `common/repositories/` (`PrismaRepository → TenantRepository → AuditableRepository → SoftDeleteRepository`, which `FileAssetRepository` — the one real precedent — actually extends, per that file's own hierarchy documentation) | Every new versioned/soft-deletable repository here (`RetentionPolicyRepository`, `LegalHoldRepository`) extends `SoftDeleteRepository`, matching the documented convention, **not** the other hierarchy (an earlier draft of this milestone picked the wrong one and was corrected — see "Bugs caught during self-review") |
| Scheduled jobs | `CronService` (infrastructure/scheduler) | `CompliancePurgeScheduler` registers one daily cron job through it — no new scheduling mechanism |
| Logging | `AppLoggerService` | Used directly everywhere |

## What was built

### Enterprise Audit Framework
- `AuditEvent` (immutable, append-only) — the single table behind Audit Events, User/Session/
  Administrative Activity, and System Events, differentiated by `category`/`module`/`action`
  rather than one table per activity type.
- `EntityChangeLog` (immutable, append-only) — field-level previous/new values + changed-fields
  list, optionally linked to the triggering `AuditEvent`.
- `ComplianceRetentionPolicy`/`LegalHold` — ordinary versioned/soft-deletable entities.

### Automatic Audit Capture
Two complementary, deliberately non-overlapping mechanisms:
1. **`AuditInterceptor`** (global `APP_INTERCEPTOR`, registered right after `LoggingInterceptor`
   so correlation ID is already resolved) — captures request/response/execution time/exceptions/
   user identity for every non-GET request automatically, or any request bearing `@Audit()`.
   GETs are skipped by default so searching audit data doesn't recursively audit-log itself.
2. **`AuditedRepository`** (extends `SoftDeleteRepository`) — future business repositories
   extend this instead of `SoftDeleteRepository` directly to get automatic before/after diffing
   on create/update/softDelete/restore, computed via `EntityDiffUtil`, with zero change to how
   the repository is called. This is the piece that actually produces real field-level diffs —
   `AuditInterceptor` alone only ever sees the HTTP request/response, never a prior entity
   snapshot, so it cannot do this by itself.

Login/logout/failed-login/password/permission/role/config/API/file operations are covered by
`ActivityLoggerService`'s typed convenience methods, all funneling into the same `AuditService`.

### Audit Decorators
`@Audit(options)`, `@AuditIgnore()`, `@AuditEntity(type)`, `@TrackChanges()` — all metadata-only,
read by `AuditInterceptor` via `Reflector`.

### Compliance Framework
`ComplianceService`: per-category retention policies, legal holds (entity-scoped or tenant-wide),
`isUnderLegalHold()` checks, and `purgeExpired()`. **Documented simplification**: purge respects
the `legalHoldExempt` boolean set at write time, not a live join against individual `LegalHold`
rows (`AuditEvent` has no FK to `LegalHold` — that join isn't schema-supported here). Stated
plainly in `compliance.service.ts`'s own doc comment, not glossed over.

### Activity Timeline / Search / Export
`ActivityTimelineService` (actor timeline + entity timeline — deliberately one generic method
each, not six near-identical ones per subject type), `AuditSearchService` (by user/date/action/
entity/module/severity/category, paginated), `AuditExportService` (JSON and CSV need no new
dependency; Excel needs **`exceljs`, added to package.json — not previously a dependency**, run
`npm install`). PDF is explicitly out of scope per this milestone's own brief.

### Alert Framework
`AuditAlertService`: in-memory sliding-window multiple-failed-login detection (15 min / 5
attempts — single-process only; noted as needing Redis-backed counting if EduNexus ever runs
multiple API instances), privilege-escalation and config-change signals, all persisted as
CRITICAL `AuditEvent` rows and forwarded to the existing `SecurityAuditLogger`.

### Performance
Async, batched writes: `AuditService.record()` never awaits a DB call — it buffers and flushes
via `createMany()` every 2s or at 200 buffered events, whichever first, with a final flush on
`onModuleDestroy`. Trade-off stated directly in the file: a hard crash between flushes can lose
recent buffered events; that's the accepted cost of never letting audit logging slow down or
fail a real request. `EntityHistoryService.recordChange()` writes change-history rows eagerly
(not buffered) since diff data may be read back immediately by business logic — only the
`AuditEvent` mirror of that change goes through the buffer.

## Bugs caught and fixed during self-review

1. **Wrong repository hierarchy.** An early draft had `RetentionPolicyRepository`/
   `LegalHoldRepository` extending `common/base/BaseRepository` — the hierarchy with no real
   business-repository usage in this codebase. Caught by checking which hierarchy
   `FileAssetRepository` (the one actual precedent) extends, and rewritten to extend
   `SoftDeleteRepository` instead, matching that file's own "future business modules should
   extend this" documentation.
2. **NestJS DI bug in `AuditService`.** An early draft took `flushIntervalMs`/`maxBufferSize` as
   constructor parameters with default values — NestJS cannot inject bare `number` parameters
   without an explicit `@Inject()` token, so this would have failed to resolve at runtime.
   Fixed by making them class-level constants instead of constructor-injected values.
3. **Invalid `ConstructorParameters<>` usage on an abstract class** in an early draft of
   `AuditedRepository` — TypeScript's `ConstructorParameters<T>` requires a concrete
   (`new (...) => ...`) type, which an `abstract class` reference is not. Fixed by typing the
   constructor parameter directly as `PrismaFullModelDelegate<T>`.
4. **`typeof import('exceljs')` would have failed to compile** before the dependency is even
   installed (TypeScript resolves module-specifier types against `node_modules` even when only
   used as a type). Fixed by using a minimal local interface shape for the exceljs surface this
   file actually touches, and a computed (non-literal) dynamic `import()` so TypeScript treats it
   as `any` instead of trying to resolve the real module's types.
5. **Duplicate `app.module.ts` edits from an interrupted earlier pass in this same conversation**
   left three duplicate `AuditModule`/`AuditInterceptor` import lines and a duplicate module-list
   entry. Caught by grepping the file after resuming and rewritten cleanly — see the file as
   delivered, not as an intermediate state.

## Verification performed (no compiler access in this environment)

- Every relative import path across all 22 new/changed TypeScript files resolved
  programmatically against the actual file tree.
- Every named import checked against the actual exports of its source file.
- Grepped for `as never`/`as any` escape-hatch casts across all new code — none remain.
- Every `BaseRepository`/`SoftDeleteRepository`/`PrismaModelDelegate` method call checked
  against the real signatures in this specific codebase (not assumed from a different lineage
  worked on earlier in this project's history).

No `npm install`/`tsc`/`prisma generate` was run — no network access in this environment. Please
run a real build before treating this as production-verified.

## Known gaps (documented, not hidden)

- **Tenant enumeration for scheduled purging** has no dedicated source (no Institution/tenant
  registry exists yet in B1.1–B2.12). `CompliancePurgeScheduler` works around this by purging
  only tenants that have at least one active `ComplianceRetentionPolicy` — compliance retention
  is opt-in per tenant, and a tenant with zero policies is simply never auto-purged (the safe
  default).
- **Legal hold vs. purge is a flag, not a live join** (see Compliance Framework above).
- **Failed-login counting is single-process** (see Alert Framework above).
- **No REST controllers.** This milestone is the shared framework; a `modules/audit` controller
  exposing search/export/timeline over HTTP was not in scope for "extend the existing project"
  in the way the brief frames it (build the reusable infrastructure first).

## Files created

```
prisma/schema-additions/schema.audit.additions.prisma
src/common/interfaces/audit-event.interface.ts
src/common/interfaces/audit-service.interface.ts
src/common/interfaces/compliance.interface.ts
src/common/utils/entity-diff.util.ts
src/common/utils/audit-metadata.util.ts
src/common/utils/audit-context.util.ts
src/common/decorators/audit.decorator.ts
src/common/audit/repositories/audit-event.repository.ts
src/common/audit/repositories/entity-change-log.repository.ts
src/common/audit/repositories/compliance.repository.ts
src/common/audit/audit.service.ts
src/common/audit/activity-logger.service.ts
src/common/audit/audit-alert.service.ts
src/common/audit/entity-history.service.ts
src/common/audit/audit-search.service.ts
src/common/audit/activity-timeline.service.ts
src/common/audit/audit-export.service.ts
src/common/audit/compliance.service.ts
src/common/audit/compliance-purge.scheduler.ts
src/common/audit/audit.module.ts
src/common/repositories/audited.repository.ts
src/common/interceptors/audit.interceptor.ts
IMPLEMENTATION_SUMMARY_B2_13.md
```

## Files modified

```
src/app.module.ts        — registered AuditModule; registered AuditInterceptor as a global
                            APP_INTERCEPTOR, positioned right after LoggingInterceptor
package.json              — added "exceljs" dependency (Excel export only; JSON/CSV need nothing new)
```

No other existing file was changed.

## Confirmation

The Enterprise Audit, Activity Logging & Compliance Framework — automatic capture, entity
change tracking, compliance/retention/legal-hold, activity timelines, search, JSON/CSV/Excel
export, and the alert framework — is functionally complete and internally consistent by manual
and scripted review, with every simplification and gap above stated directly rather than
glossed over. All future EduNexus business modules (B3 onward) should extend `AuditedRepository`
instead of `SoftDeleteRepository` directly for entity-level tracking, and use
`ActivityLoggerService`/`AuditAlertService` for the specific action types this framework already
covers, rather than implementing custom audit logic.
