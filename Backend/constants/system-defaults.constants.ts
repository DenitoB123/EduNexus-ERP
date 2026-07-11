import { APP_CONSTANTS } from './app.constants';
import { API_CONSTANTS } from './api.constants';
import { CACHE_CONSTANTS } from './cache.constants';
import { VALIDATION_CONSTANTS } from './validation.constants';

/**
 * Aggregates the platform's default values behind one import so
 * future modules don't need to know which specific constants file a
 * given default lives in. Values are sourced from the existing
 * B1.4 constants files, not redefined here.
 */
export const SYSTEM_DEFAULTS = {
  locale: APP_CONSTANTS.DEFAULT_LOCALE,
  timezone: APP_CONSTANTS.DEFAULT_TIMEZONE,
  pagination: {
    page: 1,
    pageSize: API_CONSTANTS.DEFAULT_PAGE_SIZE,
    maxPageSize: API_CONSTANTS.MAX_PAGE_SIZE,
  },
  cache: {
    ttlSeconds: CACHE_CONSTANTS.DEFAULT_TTL_SECONDS,
  },
  validation: {
    minPasswordLength: VALIDATION_CONSTANTS.MIN_PASSWORD_LENGTH,
    maxNameLength: VALIDATION_CONSTANTS.MAX_NAME_LENGTH,
    maxTextLength: VALIDATION_CONSTANTS.MAX_TEXT_LENGTH,
  },
} as const;
