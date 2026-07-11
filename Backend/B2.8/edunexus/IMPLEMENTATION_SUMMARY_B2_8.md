# EduNexus Backend — B2.8: CQRS, Command Bus & Query Bus Infrastructure

## Status

**Complete**, as an independent infrastructure milestone built directly on **B1.1–B2.2** only, per the explicit instruction that B2.3–B2.7 are being developed in parallel and have not been merged. Nothing in this milestone reimplements validation, mapping, RBAC, or event-bus-enhancement work that belongs to B2.3–B2.7; those are wired as documented extension points instead (see "Extension points" below).

58 files added, 1 file modified. Zero new npm dependencies — `class-validator`, `class-transformer`, `@nestjs/core` (`DiscoveryModule`/`DiscoveryService`/`Reflector`) were already present in `package.json` from B1.1.

## What B1.1–B2.2 already provided, and was reused as-is (not duplicated)

| Concern | Existing component | How B2.8 uses it |
|---|---|---|
| Transactions + retry | `TransactionService` (`database/services`) | `CommandTransactionBehavior` calls `run()`/`runWithRetry()` directly |
| Multi-tenancy | `TenantContextService`, `TenantContextData`, `TenantIsolationMiddleware` | `CqrsContextFactory`, tenancy pipeline behaviors |
| Caching | `CacheService` (`infrastructure/cache`) | `QueryCachingBehavior` |
| Structural validation | `class-validator` (already a dependency, used by `ValidationPipe`) | `CommandValidationBehavior` / `QueryValidationBehavior` |
| Event bus | `EventBus`, `@OnEvent`, `EventSubscriberExplorer` (`infrastructure/events`) | `ProjectionHandlerBase` is a plain event handler; no second subscription mechanism was introduced |
| Exceptions | `ValidationException`, `AuthorizationException`, `BusinessException`, `TenantException` | Thrown by pipeline behaviors on failure |
| Logging | `AppLoggerService` | Every bus/behavior logs through it |
| Discovery pattern | `DiscoveryModule`/`Reflector`, as already used by `EventSubscriberExplorer` | `CommandHandlerExplorer`/`QueryHandlerExplorer` use the same approach, at class-metadata level instead of method-metadata level |

## Files created

```
src/common/cqrs/
├── constants/cqrs.constants.ts
├── interfaces/
│   ├── cqrs-context.interface.ts      (ICqrsExecutionContext)
│   ├── command.interface.ts           (ICommand, ICommandHandler, ICommandBus, CommandType)
│   ├── query.interface.ts             (IQuery, IQueryHandler, IQueryBus, QueryType)
│   ├── pipeline.interface.ts          (ICommandPipelineBehavior, IQueryPipelineBehavior)
│   ├── projection.interface.ts        (IProjection, IReadModel)
│   └── extension-points.interface.ts  (IBusinessRuleValidator, IProjectionMapper, IAuthorizationProvider)
├── commands/
│   ├── base.command.ts (+ .spec)
│   ├── tenant.command.ts
│   ├── authenticated.command.ts
│   ├── transactional.command.ts
│   └── bulk.command.ts
├── queries/
│   ├── base.query.ts
│   ├── tenant.query.ts
│   ├── paginated.query.ts
│   ├── search.query.ts
│   ├── filter.query.ts
│   └── report.query.ts
├── decorators/
│   ├── command-handler.decorator.ts    (@CommandHandler)
│   ├── query-handler.decorator.ts      (@QueryHandler)
│   └── require-cqrs-access.decorator.ts (@RequireRolesForCqrs / @RequirePermissionsForCqrs)
├── handlers/
│   ├── command-handler.base.ts
│   └── query-handler.base.ts
├── buses/
│   ├── command-bus.service.ts (+ .spec)
│   ├── query-bus.service.ts (+ .spec)
│   ├── command-handler.registry.ts (+ .spec)
│   ├── query-handler.registry.ts
│   ├── command-handler.explorer.ts
│   └── query-handler.explorer.ts
├── pipelines/
│   ├── pipeline-runner.util.ts (+ .spec)
│   ├── command-logging.behavior.ts
│   ├── command-tenancy.behavior.ts (+ .spec)
│   ├── command-authorization.behavior.ts
│   ├── command-validation.behavior.ts (+ .spec)
│   ├── command-transaction.behavior.ts (+ .spec)
│   ├── query-logging.behavior.ts
│   ├── query-tenancy.behavior.ts
│   ├── query-authorization.behavior.ts
│   ├── query-validation.behavior.ts
│   └── query-caching.behavior.ts
├── projections/
│   ├── projection-handler.base.ts (+ .spec)
│   └── projection-idempotency.guard.ts (+ .spec)
├── read-models/
│   └── read-model.base.ts
├── utils/
│   ├── correlation-id.util.ts
│   ├── cqrs-context.factory.ts
│   └── cqrs-transaction-context.service.ts
├── cqrs.module.ts
└── index.ts (barrel)
```

## Files modified

- `src/app.module.ts` — added `CqrsModule` import and registration alongside `EventModule` (2 lines).

## How it works

1. A controller (or, later, a queue consumer) builds an `ICqrsExecutionContext` via `CqrsContextFactory.fromRequest(req)`, constructs a `Command`/`Query`, and calls `CommandBus.execute()` / `QueryBus.execute()`.
2. **Command pipeline** (in order): `CommandLoggingBehavior` → `CommandTenancyBehavior` → `CommandAuthorizationBehavior` → `CommandValidationBehavior` → `CommandTransactionBehavior` → the resolved `ICommandHandler.execute()`.
3. **Query pipeline**: `QueryLoggingBehavior` → `QueryTenancyBehavior` → `QueryAuthorizationBehavior` → `QueryValidationBehavior` → `QueryCachingBehavior.wrapExecute()` (cache lookup → resolved `IQueryHandler.execute()` → cache write).
4. Handlers are plain `@Injectable()` providers decorated with `@CommandHandler(SomeCommand)` / `@QueryHandler(SomeQuery)`, discovered automatically at boot by `CommandHandlerExplorer`/`QueryHandlerExplorer` via `DiscoveryModule` — a business module (B3+) never registers anything manually.
5. Projections are ordinary `@OnEvent('...')` event handlers that extend `ProjectionHandlerBase`, which adds an idempotency check (`ProjectionIdempotencyGuard`, backed by `CacheService`) before applying the projection.

## Extension points for B2.3–B2.7 (not implemented here, by design)

| Milestone | Extension point | Where |
|---|---|---|
| B2.3 (business validation) | `IBusinessRuleValidator<TCommand>`, DI token `CQRS_BUSINESS_RULE_VALIDATORS` | `interfaces/extension-points.interface.ts` — `CommandValidationBehavior` already loops over whatever is registered there; currently an empty array |
| B2.4 (mapping framework) | `IProjectionMapper<TEvent, TReadModel>` | `interfaces/extension-points.interface.ts` — optional helper a `ProjectionHandlerBase` subclass may use instead of hand-rolling event→read-model mapping |
| B2.6 (full RBAC) | `IAuthorizationProvider`, DI token `CQRS_AUTHORIZATION_PROVIDER` | Consulted by `CommandAuthorizationBehavior`/`QueryAuthorizationBehavior` when present; falls back to `context.roles`/`context.permissions`, and to a log-and-allow default when no auth context exists at all — identical degrade behavior to the existing `RolesGuard`/`PermissionsGuard` |
| B2.7 (enhanced event infra) | N/A — the existing `EventBus` is used as-is | `ProjectionIdempotencyGuard` adds idempotency *at the projection layer only*, not as a general event-bus feature; documented in that file as forward-looking, not a workaround for a bug that exists today |

None of these require changes to `CommandBus`, `QueryBus`, or the pipeline runner when B2.3–B2.7 land — only new providers registered under the existing DI tokens.

## Known gap, documented rather than silently worked around

`CommandTransactionBehavior` opens a real Prisma transaction (via `TransactionService.runWithRetry()`) and exposes the `tx` client through a new `CqrsTransactionContextService` (an `AsyncLocalStorage`, same mechanism as `TenantContextService`). **However**, B2.2's repository classes (`PrismaRepository`/`TenantRepository`/etc.) bind their Prisma delegate once at construction, so they do not currently pick up that `tx` automatically. A handler that needs its repository writes to share the exact transaction this behavior opens must construct a transaction-scoped repository instance itself (e.g. `new StudentRepository(tx.student)`) using the `tx` passed into `work()`. Closing this gap properly means changing B2.2's repository construction contract (a request/command-scoped repository provider), which is out of scope for a CQRS-infrastructure-only milestone — flagging it here for whichever future milestone touches the repository layer next.

## Verification performed

- All 58 new files pass a TypeScript syntax-only parse (`ts.transpileModule`, zero diagnostics).
- Every relative import in `src/common/cqrs/**` resolves to a real file on disk (scripted check).
- Cross-referenced every external signature used (`TransactionService.run/runWithRetry`, `CacheService.get/set/exists/wrap`, `TenantContextService`, `AppLoggerService`, all four exception classes, `PaginationInput`/`SortInput`/`SearchInput`/`FilterCondition`/`ReportAggregation` shapes) directly against the B1–B2.2 source rather than assumed.
- No duplicate class/interface names against the existing B1–B2.2 codebase (`CommandBus`, `QueryBus`, `CqrsModule`, `BaseCommand`, `BaseQuery` — none pre-existed).
- 10 spec files covering: command/query dispatch and pipeline ordering, duplicate-handler detection, tenancy enforcement (match/mismatch/missing), structural + business-rule validation, transactional vs. non-transactional dispatch, and projection idempotency (apply-once, skip-on-replay).

This was **not** run through `nest build`/`jest` in this environment (no `node_modules`, no network access to install them) — the checks above are the strongest verification available without them. Recommend running `npm install && npm run build && npm test` on your machine as the final gate before merging.

## Confirmation

The Enterprise CQRS Infrastructure for B2.8 is complete, built only against B1.1–B2.2, and does not duplicate any of B2.3–B2.7. All future EduNexus backend business modules (B3 onward) should execute business logic through Commands, Queries, and Handlers — registering `@CommandHandler`/`@QueryHandler` providers in their own feature modules — rather than placing logic directly inside controllers or services. When B2.3–B2.7 are merged, their extension points (validators, authorization provider, projection mappers) can be registered under the DI tokens listed above without modifying this milestone's bus or pipeline code.
