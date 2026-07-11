# EduNexus Backend — B2.1 Implementation Summary

## Common Base Module & Shared Domain Infrastructure

This milestone extends the cumulative backend from B1.1–B1.6. No existing
module, service, controller, or infrastructure component was recreated or
removed. Every item below is additive.

---

## Files Created

### Base Domain Layer (`src/common/base/`)
- `value-object.ts` — `ValueObject<TProps>`: immutable, structurally-compared base class for domain primitives (Money, Email, DateRange, etc.)
- `aggregate-root.ts` — `AggregateRoot`: extends the existing `BaseEntity` (B1.4), accumulates uncommitted `DomainEvent`s for the application layer to publish post-commit
- `domain-event.ts` — re-exports the existing `DomainEvent`/`IntegrationEvent` classes from the B1.3 event bus, so aggregates raise events compatible with the already-built `EventBus` rather than introducing a second event contract
- `domain-service.ts` — `DomainService`: marker base class for stateless, multi-aggregate domain logic
- `entity-factory.ts` — `EntityFactory<TEntity, TCreateProps>`: centralizes valid entity/aggregate construction
- `specification.ts` — `ISpecification<T>` / `Specification<T>` with `and()`/`or()`/`not()` composition, producing both an in-memory predicate (`isSatisfiedBy`) and a Prisma-compatible `where` fragment (`toQuery`)

### Files Modified
- `base.repository.ts` — added `findBySpecification()` / `countBySpecification()`, layering the Specification pattern on top of the existing tenant-scoping and pagination helpers (B1.2/B1.4) without changing any existing method signature
- `common.module.ts` — now provides/exports `RolesGuard`, `PermissionsGuard`, `PaginationInterceptor`, `SerializationInterceptor` (opt-in per-controller; **not** registered as global `APP_GUARD`/`APP_INTERCEPTOR`, since the Roles/Permissions guards are no-ops until a future Auth module exists — see below)
- `exception.factory.ts` — extended with `entityNotFound()`, `duplicateEntity()`, `unauthorizedAction()`, `tenant()`, `configuration()`

### Shared Interfaces (`src/common/interfaces/domain.interfaces.ts`)
`IBaseEntity`, `IAuditable`, `ISoftDelete`, `ITenantEntity`, `IDomainEvent`, `IAggregateRoot<TId>`, `IEntityFactory<TEntity, TCreateProps>`, `IUseCase<TInput, TOutput>`.
(`IRepository` and `IService` already existed from B1.4 and were not duplicated.)

### Shared Constants
- `roles.constants.ts` — `SYSTEM_ROLES` naming registry (SUPER_ADMIN, TENANT_ADMIN, SCHOOL_ADMIN, CAMPUS_ADMIN, STAFF, TEACHER, STUDENT, GUARDIAN)
- `permissions.constants.ts` — `PERMISSION_ACTIONS` + `buildPermission(resource, action)` helper for `resource:action` naming
- `system-defaults.constants.ts` — aggregates existing B1.4 constants (locale, timezone, pagination, cache TTL, validation limits) behind one import surface; values are sourced, not redefined

### Shared Exceptions (extend the existing `BaseException` hierarchy from B1.4)
- `EntityNotFoundException` (404)
- `DuplicateEntityException` (409)
- `AuthorizationException` (403)
- `TenantException` (400) — with `missingContext()` / `crossTenantAccessDenied()` factory methods
- `ConfigurationException` (500) — with `missingEnvVar(key)` factory method

### Shared Validators
- `tenant-pagination.validators.ts` — `@IsValidTenantId()`, `@IsValidPageNumber()`
(UUID, email, phone, and password validation already existed from B1.4 and were reused, not duplicated.)

### Shared Pipes
- `trim.pipe.ts` — `TrimPipe`: recursive whitespace trimming, opt-in per DTO
- `parse-uuid-array.pipe.ts` — `ParseUuidArrayPipe`: parses/validates a comma-separated UUID list query param

### Shared Decorators
- `current-user.decorator.ts` — `@CurrentUser()`, `@CurrentRole()`, `@CurrentPermissions()`, plus the `AuthContext` interface and `request.authContext` type augmentation
- `require-access.decorator.ts` — `@RequireRoles(...)`, `@RequirePermissions(...)`
(`@CurrentTenant`/`@CurrentSchool`/`@CurrentCampus`/`@CurrentSchoolGroup` already existed from B1.4.)

### Shared Guards
- `roles.guard.ts` — `RolesGuard`
- `permissions.guard.ts` — `PermissionsGuard`

### Shared Interceptors
- `pagination.interceptor.ts` — `PaginationInterceptor`: attaches HATEOAS-style pagination links to any `PaginatedResult` response
- `serialization.interceptor.ts` — `SerializationInterceptor`: applies `class-transformer`'s `instanceToPlain` to strip `@Exclude()` fields from DTO/entity instances
(`LoggingInterceptor`/`ResponseInterceptor` already existed from B1.1/B1.4 and were not duplicated.)

### Shared DTOs
- `pagination-response.dto.ts` — `PaginationResponseDto<T>` (Swagger-annotated class; the interface-level `PaginatedResult<T>` already existed)

---

## Important Design Note: Guards Are Foundation-Only

No Authentication or Users/RBAC module exists yet — this was explicitly out of
scope through B1.1–B1.6 and remains out of scope for B2.1. `RolesGuard` and
`PermissionsGuard` are real, tested guards, but until a future milestone
populates `request.authContext`, they detect its absence, log a warning, and
**allow the request through** rather than blocking every endpoint that
declares `@RequireRoles`/`@RequirePermissions`. This is intentional and
covered by unit tests (`access-guards.spec.ts`).

---

## Verification Performed

- No duplicated base classes: extended `base.repository.ts` in place rather than creating a second repository base
- No duplicate exception hierarchy: all five new exceptions extend the existing `BaseException`
- No duplicate event contract: `DomainEvent` re-exports the B1.3 infrastructure event, rather than introducing an incompatible second definition
- No duplicate constants: `system-defaults.constants.ts` references existing B1.4 constants instead of redefining values
- No circular dependencies introduced: `common/base` → `database/*` (existing direction, unchanged), `common/interceptors` → `api/pagination` (new, one-directional)
- New guards/interceptors registered as **exported, non-global** providers in `CommonModule` to avoid altering existing request-handling behavior
- Unit test coverage added for: `ValueObject`, `AggregateRoot`, `Specification` (and/or/not), all five new exceptions, both new guards, `TrimPipe`, `ParseUuidArrayPipe`

## Ready for B2.2

Future business modules (B3 onward — Admissions, Students, Finance, HR,
Library, etc.) can now:
- Extend `AggregateRoot` for entities that need domain-event tracking
- Extend `BaseRepository` and use `findBySpecification()` for complex query composition
- Extend `EntityFactory` for centralized, invariant-safe construction
- Throw `EntityNotFoundException` / `DuplicateEntityException` / `AuthorizationException` directly
- Use `@RequireRoles()` / `@RequirePermissions()` now, with enforcement activating automatically once B2.2 (or a later Auth milestone) populates `request.authContext` — no call-site changes will be needed in those future modules when that happens
