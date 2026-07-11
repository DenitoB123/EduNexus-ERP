# EduNexus Backend — B2.2 Implementation Summary

## Generic Repository & Data Access Layer

Extends the cumulative backend from B1.1–B1.6 and B2.1. No existing module,
service, or repository was recreated. Everything below is additive, with two
narrow, backward-compatible modifications called out explicitly.

---

## Files Created

### Repository Interfaces (`src/common/repositories/interfaces/`)
- `prisma-full-delegate.interface.ts` — `PrismaFullModelDelegate<T>`: superset of B1.4's `PrismaModelDelegate` adding `upsert`, `createMany`, `updateMany`, `deleteMany`, `delete`. Kept as a separate, additive interface — the original `PrismaModelDelegate` and B1.4's `BaseRepository` are untouched and still compile against it.
- `prisma-read-delegate.interface.ts` — `PrismaReadDelegate<T>`: a delegate type with **no write methods at all**, used by `ReadOnlyRepository` so write-safety is enforced by the type system, not convention.
- `read-repository.interface.ts` — `IReadRepository<T>` (findById, findOne, findMany, exists, count)
- `write-repository.interface.ts` — `IWriteRepository<T>` (create, update, upsert, batchCreate, batchUpdate, batchDelete)
- `tenant-repository.interface.ts` — `ITenantRepository<T>` (combines read+write)
- `auditable-repository.interface.ts` — `IAuditableRepository<T>` (behavioral contract, no new methods)
- `soft-delete-repository.interface.ts` — `ISoftDeleteRepository<T>` (adds softDelete/restore/permanentDelete)
- `specification-repository.interface.ts` — `ISpecificationRepository<T>` (findBySpecification/countBySpecification), reusing B2.1's `ISpecification`

### Repository Base Classes (`src/common/repositories/`)
A four-layer inheritance chain, each layer adding exactly one capability:

1. **`PrismaRepository<T>`** — raw Prisma CRUD (protected `raw*` methods only: rawFindById, rawFindOne, rawFindMany, rawExists, rawCount, rawCreate, rawUpdate, rawUpsert, rawBatchCreate/Update/Delete, rawHardDelete). No tenant concept at all — deliberately does not implement `IReadRepository`/`IWriteRepository`, since those are tenant-aware and this layer isn't.
2. **`TenantRepository<T>`** extends `PrismaRepository<T>` — implements `IReadRepository`, `IWriteRepository`, `ISpecificationRepository`. Every method injects/verifies `tenantId` via the existing B1.2 `TenantQueryHelper`. Writes call `assertBelongsToTenant()` first, so a valid ID from a different tenant produces a 404, never a cross-tenant mutation.
3. **`AuditableRepository<T>`** extends `TenantRepository<T>` — overrides create/update/upsert/batchCreate/batchUpdate to stamp `createdBy`/`updatedBy` from the supplied `actorId`. `createdAt`/`updatedAt` remain Prisma's own column-level responsibility (B1.2 convention), unchanged.
4. **`SoftDeleteRepository<T>`** extends `AuditableRepository<T>` — adds `softDelete`, `restore`, `permanentDelete`. Permanent deletion is disabled by default (`allowHardDelete = false`); a subclass sets that flag to `true` in its constructor to enable it — **no deletion logic needs to be reimplemented**, satisfying the spec's "without duplicating code in business modules" requirement directly.

**`ReadOnlyRepository<T>`** — a separate, parallel class (not part of the write chain) built on `PrismaReadDelegate`, for reporting/analytics/read-model repositories that must never write.

**Recommendation for B3+**: business modules should extend `SoftDeleteRepository<T>` for standard entities, or `ReadOnlyRepository<T>` for pure read-models.

### Specification Support
- `specification-query.helper.ts` — `SpecificationQueryHelper`: the **single** implementation of "run a Specification as a tenant-scoped, soft-delete-excluded query," now used by both B2.1's original `BaseRepository` (refactored, see below) and the new `TenantRepository`/`ReadOnlyRepository` — eliminating what would otherwise have been duplicated logic.

### Query Builder (`src/common/query-builder/`)
- `enterprise-query-builder.ts` — `EnterpriseQueryBuilder`: wraps the existing B1.2 `QueryBuilder` (filter+search+sort+pagination+tenant scoping) and adds Prisma `include` construction (flat and nested relations) — the one capability the original didn't cover.
- `aggregation-builder.ts` — `AggregationBuilder`: declarative `{ groupBy, aggregations: [{field, fn}] }` → Prisma `groupBy()`/`aggregate()` argument shape (`_count`/`_sum`/`_avg`/`_min`/`_max`).

### Shared DTOs
- `bulk-insert-upsert.dto.ts` — `BulkInsertDto<T>`, `BulkUpsertDto<T>` (+ `BulkUpsertItemDto<T>`), `BulkRestoreDto`. (`BulkDeleteDTO`/`BulkUpdateDTO` already existed from B1.4 and were not duplicated.)

### Shared Utilities
- `repository-query.util.ts` — `RepositoryQueryUtil`: single facade combining `EnterpriseQueryBuilder` + `AggregationBuilder` for repository call sites that need both.

### Folder-Structure Barrel Re-exports
Per the requested `common/{pagination,filters,search,sorting,transactions}` structure, added `index.ts` re-export files in each — these point at the **existing** B1.2/B1.4/B1.6 implementations (`PaginationHelper`, `CursorPaginationHelper`, `FilterHelper`, `SearchHelper`, `SortHelper`, `SearchEngine`, `SortingEngine`, `TransactionService`) rather than reimplementing them, per the "do not duplicate B1/B2.1 code" instruction.
**Note**: `common/filters/` already existed from B1.1 holding HTTP exception filters (`AllExceptionsFilter`, `HttpExceptionFilter`, `PrismaExceptionFilter`) — an unrelated concern that happens to share the folder name with B2.2's "filtering engine." Both coexist in that folder; nothing was renamed or removed.

---

## Files Modified (narrow, additive changes only)

- **`common/base/base.repository.ts`** — `findBySpecification`/`countBySpecification` now delegate to the new shared `SpecificationQueryHelper` instead of duplicating the where-building logic inline. Public method signatures and behavior are unchanged.
- **`database/interfaces/base-model.interface.ts`** — added `'between'` to the `FilterOperator` union (was missing; the spec explicitly requires it). Purely additive to the type union.
- **`database/helpers/filter.helper.ts`** — added the `'between'` case (`{ gte: min, lte: max }` from a `[min, max]` tuple). All existing operator cases unchanged.
- **`database/exceptions/database.exceptions.ts`** — `DatabaseException` gained an optional 4th constructor parameter, `cause`, and `DatabaseErrorHandler.wrap()` now passes the original error through as `.cause` instead of discarding it. **Why**: this was a latent gap — `TransactionService.runWithRetry()` (new, below) needs to inspect the original Prisma error code after a failure to decide whether to retry, and the previous `wrap()` implementation discarded that information entirely. Fully backward-compatible: the new parameter is optional and appended last.
- **`database/services/transaction.service.ts`** — added `runWithRetry()`: retries a transaction on retriable Prisma error codes (reusing the existing `DatabaseErrorHandler.isRetriable()` check from B1.2) with exponential-ish backoff, up to a configurable `maxAttempts`. `run()` and `runBatch()` are unchanged.

---

## Capability Checklist (spec requirements → where implemented)

| Requirement | Implementation |
|---|---|
| Create/Update/Delete/Soft Delete/Restore | `TenantRepository`, `SoftDeleteRepository` |
| Find By ID/One/Many/Exists/Count | `TenantRepository`, `ReadOnlyRepository` |
| Pagination (offset + cursor) | Existing `PaginationHelper`/`CursorPaginationHelper` (B1.2), re-exported under `common/pagination/` |
| Search (global/field/multi-field/exact/partial/case-insensitive) | Existing `SearchHelper`/`SearchEngine` (B1.2/B1.6) |
| Filtering (eq/neq/gt/lt/**between**/contains/startsWith/endsWith/in/notIn/null) | `FilterHelper`, extended with `between` |
| Sorting (single/multi-field, asc/desc) | Existing `SortHelper`/`SortingEngine` |
| Transactions (nested via shared `tx` client, retry) | `TransactionService.run()` (B1.2) + new `runWithRetry()` |
| Batch Insert/Update/Delete, Upsert | `PrismaRepository` raw methods, exposed through `TenantRepository`/`AuditableRepository` |
| Specification pattern (AND/OR/NOT, nested) | B2.1's `Specification`, now used via shared `SpecificationQueryHelper` |
| Multi-tenancy enforcement | `TenantRepository.assertBelongsToTenant()` on every write |
| Audit support (createdBy/updatedBy/deletedBy) | `AuditableRepository`, `SoftDeleteRepository` |
| Soft delete without duplicating business-module code | `allowHardDelete` flag on `SoftDeleteRepository` |

---

## Verification Performed

- No duplicate repositories: extended the existing `BaseRepository` rather than replacing it; new hierarchy is additive and layered
- No duplicate specification logic: both old and new repositories now share `SpecificationQueryHelper`
- No duplicate query/pagination/search/sort logic: all barrel files re-export B1.2/B1.6 implementations
- No circular dependencies: `common/repositories` → `database/*` (existing direction), `common/query-builder` → `database/helpers` (existing direction)
- No broken imports: `PrismaFullModelDelegate` and `PrismaReadDelegate` are additive interfaces; nothing consuming the original `PrismaModelDelegate` was changed
- Unit tests added for: the full `TenantRepository`/`AuditableRepository`/`SoftDeleteRepository` chain (tenant isolation, actor stamping, hard-delete gating), `ReadOnlyRepository` (including a runtime assertion that no write methods exist), `EnterpriseQueryBuilder`, `AggregationBuilder`, the `between` filter operator, and `TransactionService.runWithRetry()` (success, retriable-error retry, non-retriable no-retry, and exhausted-attempts cases)

## Ready for B2.3 / B3

All future EduNexus business modules (Admissions, Students, Finance, Library,
HR, Payroll, Inventory, Procurement, Health, Security, Governance, etc.)
should extend `SoftDeleteRepository<T>` (or `ReadOnlyRepository<T>` for
read-only data) instead of writing their own CRUD, tenant-scoping, audit
stamping, or soft-delete logic. The Generic Repository Layer is complete.
