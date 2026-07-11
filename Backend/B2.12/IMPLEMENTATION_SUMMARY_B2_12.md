# IMPLEMENTATION_SUMMARY_B2_12.md
## Enterprise Reporting & Export Infrastructure

**Milestone:** B2.12 (parallel milestone — merges at B2.21 Backend Foundation Consolidation)
**Assumed baseline:** Enterprise Backend Foundation B1.1–B2.2 only. No other business modules exist yet; `src/modules/` did not exist before this milestone.

---

## 1. Folder Structure Delivered

```
src/modules/reporting/
├── reporting.module.ts
├── reporting.service.ts                    # top-level facade: generation orchestration, executions, downloads
├── reporting.controller.ts
├── reporting-execution.repository.ts        # Prisma repo for ReportExecution (extends BaseRepository)
├── report-generation-runner.service.ts       # shared run→export→upload→persist logic (sync + async + scheduled)
│
├── report-engine/
│   ├── report-engine.service.ts             # orchestrates definition + dataset + query
│   ├── report.factory.ts                    # ReportDefinition registry + parameter resolution
│   ├── report.builder.ts                    # fluent DatasetQueryContext builder
│   └── dataset-registry.service.ts           # IAnalyticsDatasetProvider registry (extra — see §4)
│
├── export/
│   ├── export.service.ts
│   ├── pdf.exporter.ts                      # pdfkit, paginated table renderer, branding header/footer
│   ├── excel.exporter.ts                    # exceljs, typed columns, currency/date formats
│   ├── csv.exporter.ts                      # dependency-free, streaming-capable
│   ├── json.exporter.ts
│   └── export-tokens.ts                     # REPORT_EXPORTERS multi-provider DI token (extra)
│
├── scheduler/
│   ├── scheduled-report.service.ts
│   ├── scheduled-report.repository.ts        # extra — Prisma repo for ScheduledReport
│   ├── report-generation.job-handler.ts      # extra — JobHandlerBase for queued generation
│   └── schedule-frequency.mapper.ts          # extra — DAILY/WEEKLY/... → cron expression
│
├── templates/
│   ├── template.service.ts
│   ├── template-branding.engine.ts           # extra — Handlebars branding placeholder resolver
│   └── report-template.repository.ts         # extra — Prisma repo for ReportTemplate
│
├── dto/
│   ├── generate-report.dto.ts
│   ├── create-report-template.dto.ts / update-report-template.dto.ts
│   ├── create-scheduled-report.dto.ts / update-scheduled-report.dto.ts
│   └── report-query.dto.ts
│
├── interfaces/
│   ├── report-definition.interface.ts        # ReportDefinition/ReportColumn/ReportParameter
│   ├── dataset-provider.interface.ts         # IAnalyticsDatasetProvider — the extension point
│   ├── exporter.interface.ts                 # IReportExporter — the extension point
│   ├── report-execution.interface.ts
│   ├── generation-job.interface.ts           # extra — job payload + stored generation request
│   └── branding.interface.ts
│
├── constants/
│   ├── reporting.constants.ts                # job/event names, cache keys, limits
│   ├── export-format.enum.ts
│   ├── report-status.enum.ts
│   ├── schedule-frequency.enum.ts
│   └── report-permissions.constants.ts
│
├── events/
│   ├── report-generation-requested.event.ts / -completed.event.ts / -failed.event.ts
│   ├── report-downloaded.event.ts
│   ├── template-lifecycle.event.ts
│   └── schedule-lifecycle.event.ts
│
└── prisma-fragment/
    └── reporting.models.prisma               # additive schema, merge at B2.21 (see §5)
```

45 TypeScript files + 1 Prisma fragment. Files marked "extra" go beyond the requested skeleton where the feature genuinely required them (e.g. persistence repositories, a job handler); no requested file was omitted or renamed.

---

## 2. How This Satisfies Each Requirement

| Requirement | Where |
|---|---|
| Dynamic/parameterized/filtered/sorted/grouped/aggregated/paginated reports | `report-engine/*`, `dto/generate-report.dto.ts`, `interfaces/dataset-provider.interface.ts` (`DatasetQueryContext`) |
| PDF / Excel / CSV / JSON export, extensible | `export/*` — each format is a standalone `IReportExporter`; adding a format = one new class + one line in `reporting.module.ts`'s `REPORT_EXPORTERS` factory |
| Saved templates, dynamic layouts, branding placeholders | `templates/*`, `interfaces/branding.interface.ts` |
| Daily/weekly/monthly/yearly/custom cron | `scheduler/schedule-frequency.mapper.ts` + `CronService` (existing infra) |
| Download / email / notification delivery, background generation | `reporting.service.ts` (sync+signed URL), `scheduler/scheduled-report.service.ts` (email delivery via `EmailQueueService` on `GENERATION_COMPLETED`), events left for a future Notification module (§4) |
| Queue-based generation, progress tracking, retry, streaming | `report-generation-runner.service.ts` + `scheduler/report-generation.job-handler.ts` (queued via existing `JobQueueService`/`JobRegistry`/retry infra); `progress` field on `ReportExecution`; `export/csv.exporter.ts` implements `exportStream()`, `ExportService.exportStream()` falls back to buffered output for exporters that don't stream natively |
| Reusable analytics datasets | `report-engine/dataset-registry.service.ts` — `IAnalyticsDatasetProvider` is the single extension point future dashboard/business modules implement |
| Tenant isolation, RBAC, secure downloads | Every repository extends the existing `BaseRepository<T>` (tenant-scoped by construction); controller applies `PermissionsGuard` + `@RequirePermissions()`; downloads are short-lived signed URLs via `SignedUrlService`, never raw file paths |
| Auditing | Every state transition (generation requested/completed/failed, template/schedule create/update/remove, download) emits a domain event through the existing `EventBus`, plus `AppLoggerService` structured logs — see §4 for why this isn't a dedicated "Audit" module |
| Testability | Every service takes its dependencies through the constructor (no static state except the two in-memory registries, which are themselves injectable/mockable classes); `IReportExporter` and `IAnalyticsDatasetProvider` are plain interfaces, trivially mocked in unit tests |

---

## 3. Integration Points (existing infra referenced, not regenerated)

- **`PrismaService`** — injected into three new repositories, which extend the existing `common/base/base.repository.ts` (`BaseRepository<T>`) exactly like any future business module would.
- **`AppLoggerService`** — every service calls `setContext()` in its constructor, matching the pattern in `PrismaService`/`TransactionService`.
- **`EventBus`** (`infrastructure/events`) — all reporting domain events (`events/*.ts`) extend the existing `DomainEvent` base class and are emitted via `eventBus.emit()`.
- **`JobQueueService` / `JobRegistry`** (`infrastructure/jobs`) — `ReportGenerationJobHandler` extends `JobHandlerBase`, self-registers via `onModuleInit()`, and is enqueued with `jobQueueService.enqueue(REPORTING_JOB_NAMES.GENERATE_REPORT, ...)`, identical to how `EmailQueueService`/`SendEmailJobHandler` work today. Retry/backoff is entirely delegated to the existing `RetryJobsService`/queue infra — this module never re-implements retry logic.
- **`CronService`** (`infrastructure/scheduler`) — `ScheduledReportService` calls `addCron()`/`removeCron()` per schedule and rehydrates all active schedules on boot.
- **`StorageService` / `UploadService` / `DownloadService` / `SignedUrlService`** (`infrastructure/storage`) — generated files are uploaded under `reports/{tenantId}/{executionId}.{ext}` and only ever exposed via time-limited signed URLs.
- **`EmailQueueService`** (`infrastructure/email`) — used to deliver completed scheduled reports as attachments.
- **RBAC guards** (`common/guards/permissions.guard.ts`, `common/decorators/require-access.decorator.ts`) — applied at the controller; permission strings defined in `constants/report-permissions.constants.ts`.
- **Tenant context decorators** (`common/decorators/current-tenant.decorator.ts`) — used in the controller to build the `TenantScope` passed into every service call; no reporting code reads tenant context from anywhere else.

---

## 4. Deliberate Deviations From the Prompt, and Why

1. **BullMQ/Redis queueing → existing RabbitMQ-based job infrastructure.** The prompt's tech stack lists BullMQ + Redis for background processing, but B1.1–B2.2 already implements a complete, non-BullMQ job pipeline (`infrastructure/jobs` on RabbitMQ, `infrastructure/scheduler` on `@nestjs/schedule` + `cron`, both `@Global`). Per the explicit instruction "Reference them through dependency injection only. Do not regenerate them," this module uses that existing pipeline rather than introducing a second, parallel queueing stack. Redis is used elsewhere in the foundation for caching (`infrastructure/cache`), not jobs; nothing in this module required changing that.

2. **No dedicated "Audit" or "Notification" modules exist yet at B2.2.** The foundation currently has a *security*-focused audit logger (`security/monitoring/security-audit.logger.ts`) and channel-level notification *providers* (email/SMS/push), but no general business-event audit trail or in-app notification module. This module fills that gap the same way any other B2.x module would have to: it emits structured domain events (`events/*.ts`) via the existing `EventBus`, and a future Audit/Notification module (or B2.21 consolidation) can subscribe to `REPORTING_EVENT_NAMES.*` without any change here. Email delivery for scheduled reports is implemented directly against `EmailQueueService` since that concrete capability already exists; in-app "notification" delivery is represented as an event only, since no in-app notification module exists to call.

3. **New dependencies required, not yet in `package.json`:** `exceljs` (Excel export), `pdfkit` (+ `@types/pdfkit` as a dev dependency) (PDF export). CSV and JSON exporters are dependency-free by design. `handlebars` (branding placeholders) was already a dependency (used by `EmailTemplateEngine`) and is reused as-is via `templates/template-branding.engine.ts`, which mirrors that engine's compile-and-cache pattern.

4. **`@nestjs/mapped-types` avoided.** `UpdateReportTemplateDto` is written out explicitly rather than via `PartialType()`, since `@nestjs/mapped-types` isn't currently a declared dependency and adding one silently felt out of scope for a "reference existing infra, don't add surprises" milestone.

---

## 5. Known Compile-Time Gap (by design, resolves at B2.21)

`schema.prisma` currently defines no business models (only `HealthCheck`/`SeedLog`). This module needs three new models — `ReportTemplate`, `ScheduledReport`, `ReportExecution` — which are provided as an **additive fragment** at `prisma-fragment/reporting.models.prisma`, following the exact base-field convention already documented at the top of `schema.prisma`.

Until that fragment is merged and `prisma generate` is re-run, the three new repositories (`report-template.repository.ts`, `scheduler/scheduled-report.repository.ts`, `reporting-execution.repository.ts`) reference `prisma.reportTemplate` / `prisma.scheduledReport` / `prisma.reportExecution` through a documented `as unknown as { ... }` cast, e.g.:

```ts
super((prisma as unknown as { reportTemplate: BaseRepository<ReportTemplateModel>['delegate'] }).reportTemplate);
```

This is the standard shape of the problem every parallel B2.x milestone has (build against models that don't exist in the shared schema yet) and is intentional, not an oversight — it lets this package be reviewed and merged as a unit at B2.21 by simply appending the fragment and removing the casts.

**Merge checklist for B2.21:**
1. Append `prisma-fragment/reporting.models.prisma` into `prisma/schema.prisma`.
2. `npx prisma migrate dev --name add_reporting_module`.
3. Remove the three `as unknown as {...}` casts in the repositories (delegate types will resolve natively).
4. Add `exceljs`, `pdfkit`, `@types/pdfkit` to `package.json`.
5. Import `ReportingModule` into `AppModule`.

---

## 6. Extension Contract for Future Modules

A future business module (attendance, billing, exams, ...) integrates with reporting in exactly two steps, without touching anything in this package:

```ts
// in FutureModule's own service, onModuleInit:
this.datasetRegistry.register({
  key: 'attendance.daily',
  getColumns: () => [...],
  fetch: async (ctx) => { /* tenant-scoped Prisma query */ },
});

this.reportFactory.register({
  key: 'attendance.daily-summary',
  name: 'Daily Attendance Summary',
  moduleKey: 'attendance',
  datasetKey: 'attendance.daily',
  columns: [...],
  parameters: [{ name: 'date', type: 'date', required: true }],
});
```

`ReportFactory` and `DatasetRegistry` are exported from `ReportingModule`; the future module imports `ReportingModule` to inject them.
