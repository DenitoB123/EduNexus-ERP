/**
 * Metadata keys and shared constants for the CQRS infrastructure (B2.8).
 * Kept in one place, mirroring the convention already used by
 * `common/decorators/require-access.decorator.ts` and
 * `infrastructure/events/event-subscriber.decorator.ts`.
 */
export const COMMAND_HANDLER_METADATA = 'edunexus:cqrs:command-handler';
export const QUERY_HANDLER_METADATA = 'edunexus:cqrs:query-handler';

/** Default query-cache TTL (seconds) when a QueryHandler doesn't specify one. */
export const CQRS_DEFAULT_QUERY_CACHE_TTL_SECONDS = 60;

/** Default max attempts for CommandBus-level retry of transactional commands. */
export const CQRS_DEFAULT_COMMAND_RETRY_ATTEMPTS = 3;

/** Cache-key prefix used for query-result caching. */
export const CQRS_QUERY_CACHE_PREFIX = 'cqrs:query';

/** Cache-key prefix used for projection idempotency markers. */
export const CQRS_PROJECTION_IDEMPOTENCY_PREFIX = 'cqrs:projection:applied';

/** Default TTL (seconds) for a projection idempotency marker. 24h. */
export const CQRS_PROJECTION_IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24;

/**
 * DI tokens. `CQRS_BUSINESS_RULE_VALIDATORS` and
 * `CQRS_AUTHORIZATION_PROVIDER` are the B2.3/B2.6 extension points
 * (see `interfaces/extension-points.interface.ts`) — both are
 * optional multi-providers/providers with safe defaults, registered
 * in `cqrs.module.ts`, so B2.8 works standalone and B2.3/B2.6 can
 * plug in later without touching the bus or pipeline code.
 */
export const CQRS_BUSINESS_RULE_VALIDATORS = 'CQRS_BUSINESS_RULE_VALIDATORS';
export const CQRS_AUTHORIZATION_PROVIDER = 'CQRS_AUTHORIZATION_PROVIDER';
export const CQRS_COMMAND_PIPELINE_BEHAVIORS = 'CQRS_COMMAND_PIPELINE_BEHAVIORS';
export const CQRS_QUERY_PIPELINE_BEHAVIORS = 'CQRS_QUERY_PIPELINE_BEHAVIORS';
