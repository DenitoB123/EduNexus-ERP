export const DATABASE_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
  DEFAULT_SORT_FIELD: 'createdAt',
  DEFAULT_SORT_ORDER: 'desc' as const,
  TRANSACTION_DEFAULT_TIMEOUT_MS: 10000,
  TRANSACTION_MAX_WAIT_MS: 5000,
} as const;

export const PRISMA_RETRIABLE_ERROR_CODES = new Set([
  'P1000',
  'P1001',
  'P1002',
  'P1008',
  'P1017',
]);

export const SOFT_DELETE_MODELS_EXCLUDED = new Set(['HealthCheck', 'SeedLog']);

export const TENANT_SCOPED_MODELS_EXCLUDED = new Set(['HealthCheck', 'SeedLog']);
