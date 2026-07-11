/**
 * search.constants.ts
 *
 * B2.14 — Enterprise Search & Indexing Infrastructure
 */

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const DEFAULT_SEARCH_CACHE_TTL_SECONDS = 60;
export const SUGGESTION_CACHE_TTL_SECONDS = 300;

export const INDEXING_QUEUE_NAME = 'search.indexing';
export const INDEXING_JOB_NAME = 'search.index-document';

export const DEFAULT_RECENT_SEARCHES_LIMIT = 10;
export const DEFAULT_POPULAR_SEARCHES_LIMIT = 10;
export const DEFAULT_SUGGESTION_LIMIT = 8;

/** Default per-field weight applied when a document doesn't specify its own fieldWeights. */
export const DEFAULT_FIELD_WEIGHTS = {
  title: 3,
  subtitle: 2,
  keywords: 2,
  searchableText: 1,
} as const;

/** Ranking boost multipliers (see ranking/ranking.service.ts). */
export const RANKING_BOOSTS = {
  exactMatch: 2.5,
  phraseMatch: 1.8,
  partialMatch: 1.0,
  recencyHalfLifeDays: 30,
  recencyMaxBoost: 0.5,
} as const;

export const DEFAULT_REINDEX_BATCH_SIZE = 200;
