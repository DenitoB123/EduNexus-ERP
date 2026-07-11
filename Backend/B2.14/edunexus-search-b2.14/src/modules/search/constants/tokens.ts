/**
 * tokens.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 */

// Foundation extension points (B1.1–B2.2 — provided by the host app, not this module)
export const PRISMA_SERVICE = Symbol('SEARCH_PRISMA_SERVICE');
export const EVENT_BUS = Symbol('SEARCH_EVENT_BUS');
export const QUEUE_SERVICE = Symbol('SEARCH_QUEUE_SERVICE');
export const APP_LOGGER = Symbol('SEARCH_APP_LOGGER');
export const AUDIT_SERVICE = Symbol('SEARCH_AUDIT_SERVICE');
export const PERMISSION_CHECKER = Symbol('SEARCH_PERMISSION_CHECKER');

// Optional infrastructure
export const CACHE_CLIENT = Symbol('SEARCH_CACHE_CLIENT');
export const SEARCH_LOG_STORE = Symbol('SEARCH_LOG_STORE');

// Pluggable search engine — this is the seam that lets Prisma/Elastic/OpenSearch/Meilisearch coexist.
export const SEARCH_ENGINE = Symbol('SEARCH_ENGINE');

// Module configuration
export const SEARCH_MODULE_OPTIONS = Symbol('SEARCH_MODULE_OPTIONS');
