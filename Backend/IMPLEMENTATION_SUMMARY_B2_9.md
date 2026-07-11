# IMPLEMENTATION SUMMARY — B2.9: Enterprise Asynchronous Processing Framework

## Architecture

Dual-engine, per explicit direction:

- **RabbitMQ → Enterprise Event Bus.** Unchanged. Domain events, integration
  events, pub/sub, module-to-module messaging. Everything in
  `infrastructure/{rabbitmq,jobs,scheduler}` (EventBus, RabbitMqModule,
  JobModule, SchedulerModule/CronService) is untouched — B2.9 adds files, it
  does not edit any of them.
- **BullMQ + Redis → Enterprise Background Job Engine.** New in B2.9.
  Priority queues, worker pools, delayed/scheduled/batch/workflow jobs,
  queue administration, monitoring — the capabilities the RabbitMQ
  job/scheduler stack doesn't have. Reuses the *existing* Redis connection
  config (`config/redis.config.ts`) with a distinct BullMQ key prefix so it
  cannot collide with the existing cache layer's key space.

Business modules depend on neither engine directly — only on `IEventBus`
and `IBackgroundJobService`.

```
Business module
   │
   ├─ eventBus.publish(...)        (IEventBus, token EVENT_BUS)
   │      └─ RabbitMqEventBusAdapter → existing EventBus.emit()  [RabbitMQ]
   │
   └─ jobService.enqueue(...)      (IBackgroundJobService, token BACKGROUND_JOB_SERVICE)
          └─ BullMqBackgroundJobAdapter → QueueService → IQueueProvider  [BullMQ/Redis]
```

`EventJobBridgeService` connects the two: an existing RabbitMQ event fans
out into one or more independent BullMQ jobs without blocking the request
that raised the event (e.g. `StudentCreatedEvent` → generate-student-id /
generate-portal-account / send-welcome-email / notify-parent /
generate-audit-summary, each an independent job).

## Files created (37)

```
src/common/
├── background.module.ts                          # top-level aggregator (Global)
├── interfaces/background/
│   ├── tokens.ts                                  # QUEUE_PROVIDER, JOB_SCHEDULER, QUEUE_MONITOR, RETRY_POLICY
│   ├── queue-provider.interface.ts                # IQueueProvider, IQueueHandle, IQueueProviderJob, JobPriority
│   ├── job.interface.ts                           # IJobProcessor, BackgroundJobType, IBackgroundJobEnvelope
│   ├── scheduler.interface.ts                     # IJobScheduler
│   ├── worker.interface.ts                        # IBackgroundWorker, IWorkerPoolOptions
│   ├── retry.interface.ts                         # IRetryPolicy, RetryStrategyType
│   ├── monitoring.interface.ts                    # IQueueMonitor, IQueueStatsSnapshot
│   ├── event-bus.interface.ts                     # IEventBus (EVENT_BUS)
│   └── background-job-service.interface.ts        # IBackgroundJobService (BACKGROUND_JOB_SERVICE)
├── providers/
│   ├── bullmq-queue.provider.ts                   # BullMqQueueProvider — concrete IQueueProvider
│   ├── queue-provider.module.ts                   # binds QUEUE_PROVIDER -> BullMqQueueProvider
│   ├── rabbitmq-event-bus.adapter.ts               # RabbitMqEventBusAdapter — wraps existing EventBus
│   └── bullmq-background-job.adapter.ts            # BullMqBackgroundJobAdapter — business-facing facade
├── queues/
│   ├── queue.service.ts                           # QueueService — internal engine-facing API
│   ├── queue-registry.service.ts                  # tracks created queue names
│   ├── dead-letter-queue.service.ts                # BullMQ-side DLQ list/replay/purge
│   └── background-admin.controller.ts              # pause/resume/purge/cancel/retry/requeue REST API
├── jobs/
│   ├── job-processor.base.ts                       # cross-cutting logging/audit/eventing for every processor
│   ├── job-processor.registry.ts
│   ├── batch-job.processor.ts                      # BATCH job base (chunking)
│   ├── workflow-job.processor.ts                   # WORKFLOW + EVENT_DRIVEN job base
│   └── event-job-bridge.service.ts                 # RabbitMQ event -> N independent BullMQ jobs
├── workers/
│   ├── background-worker.ts                        # binds one processor to one queue at a concurrency
│   └── worker-registry.service.ts                  # owns all workers; OnApplicationShutdown -> graceful drain
├── scheduler/
│   └── background-job-scheduler.service.ts          # IJobScheduler — reuses existing CronService/TaskScheduler
├── retry/
│   ├── retry-policy.ts                             # exponential/linear/fixed backoff -> BullMQ job options
│   └── retry-tracker.service.ts                    # short-lived in-memory attempt history for monitoring
├── monitoring/
│   ├── queue-monitor.service.ts                    # IQueueMonitor implementation
│   ├── background-monitoring.controller.ts          # stats / active / completed / failed / scheduled REST API
│   └── queue-dashboard-metadata.service.ts          # descriptive metadata for a future admin dashboard
└── utils/background/
    ├── queue-naming.util.ts                        # edunexus.bg.<domain>.<name> convention
    ├── job-serialization.util.ts
    ├── payload-validation.util.ts                   # class-validator, same pattern as B2.8 CQRS
    ├── retry-calculation.util.ts
    ├── delay-calculation.util.ts
    └── worker-registration.util.ts
```

## Files modified

**None in the cumulative backend itself.** B2.9 is delivered standalone
(per the Parallel Milestone Architecture — B2.3–B2.20 developed
independently, merged at B2.21), matching how B2.3, B2.4, B2.7, and B2.8
were each delivered. `main.ts`'s existing signal-handling already calls
`app.close()` directly, which triggers `OnApplicationShutdown` regardless
of `enableShutdownHooks()` — confirmed by inspection, so
`WorkerRegistryService`'s graceful-shutdown hook needs no `main.ts` change
at consolidation time.

**One new dependency:** `bullmq` (`^5.34.5`). `ioredis` is already a
dependency (used by the cache layer) but BullMQ is given plain connection
options rather than a shared `ioredis` instance — sharing one would create
a type conflict between the project's top-level `ioredis` and BullMQ's own
bundled version. Each BullMQ construct manages its own connection
internally, which is BullMQ's own recommended pattern regardless.

## Why no duplication of the existing RabbitMQ framework

Audited before writing anything: `infrastructure/jobs/*` +
`infrastructure/rabbitmq/*` + `infrastructure/scheduler/*` already
implement fire-and-forget jobs, delayed/scheduled jobs, cron, retry with
backoff, dead-letter recovery, job handler registry, and worker
consumption — on RabbitMQ. B2.9 does not reimplement any of it:

- `BackgroundJobScheduler` (this framework's `IJobScheduler`) delegates
  cron registration to the *existing* `CronService` and interval/timeout
  registration to the *existing* `TaskScheduler` — it only supplies what
  happens on each tick (enqueue via BullMQ instead of the RabbitMQ
  `JobQueueService`).
- `RabbitMqEventBusAdapter` wraps the *existing* `EventBus.emit()`/
  `subscribe()` — it doesn't add a second pub/sub mechanism.
- Queue naming (`edunexus.bg.*`) is namespaced distinctly from the existing
  RabbitMQ queue names (`edunexus.jobs.*`) precisely so the two systems
  never collide or get confused for each other operationally.

## Which engine to use for a given job

| Need | Use |
|---|---|
| Notify other modules a domain event occurred | `IEventBus.publish()` (RabbitMQ) |
| Run background work triggered by that event, off the request path | `IBackgroundJobService.enqueue()` (BullMQ), typically via `EventJobBridgeService` |
| True job priority ordering | BullMQ (`JobPriority` enum) — RabbitMQ framework has no priority concept today |
| Worker pool / concurrency control per queue | BullMQ (`IWorkerPoolOptions.concurrency`) |
| Pause/resume/purge a queue live | BullMQ (`BackgroundAdminController`) — RabbitMQ framework has no admin API today |
| Existing email/notification/report RabbitMQ jobs already in production | Leave them on RabbitMQ; no need to migrate for B2.9 |

## Known limitations / decisions to revisit at B2.21

- `background-admin.controller.ts` and `background-monitoring.controller.ts`
  import `@Permissions()`/`@ProtectedEndpoint()` and `@CurrentActor()` from
  B2.4's `common/decorators/*` — confirmed the exact paths against the real
  B2.4 delivery, but those files don't exist until B2.4 is merged
  alongside B2.9. **These two controllers will not compile standalone**
  until B2.4 is in the same tree — every other file in this delivery
  compiles independently (verified — see Verification below).
- `RetryTrackerService` is in-memory only (see its doc comment) — durable
  attempt history should go through `JobProcessorBase`'s domain-event
  publication instead if you need it persisted.
- `ITransactionManager`/Prisma-namespace items flagged in the B2.3 merge
  summary are pre-existing and unrelated to this delivery.

## Verification

Compiled against the real B2.3-merged codebase (not a stub project) by
copying `src/common/*` in, adding the `bullmq` dependency, and running
`npx tsc --noEmit`, then diffing against the B2.3-merge baseline error set:

- **3 new signals total**, all expected:
  - 2 are the B2.4-decorator forward-references described above (not a
    defect — confirmed the import paths are exactly correct against the
    real B2.4 delivery).
  - 1 was a genuine bug (BullMQ/ioredis type collision from sharing a
    connection instance) — **found and fixed** before this delivery: BullMQ
    now receives plain connection options instead.
- Every other file (35 of 37) compiles with zero errors against the real
  codebase, including all interfaces, both adapters, the queue engine, job
  processors, worker/scheduler/retry/monitoring layers, and the module
  wiring itself.
- No duplicate DI tokens, service names, or queue names versus the
  existing RabbitMQ framework or B2.3's Generic Service Layer tokens.

## Confirmation

The Enterprise Asynchronous Processing Framework (RabbitMQ for messaging,
BullMQ for background processing) is complete for B2.9's scope. All future
EduNexus backend business modules (B3 onward) should depend only on
`IEventBus` (`EVENT_BUS`) and `IBackgroundJobService`
(`BACKGROUND_JOB_SERVICE`) for asynchronous work — never on RabbitMQ or
BullMQ types directly — so either engine can be swapped later without
touching business-module code.
