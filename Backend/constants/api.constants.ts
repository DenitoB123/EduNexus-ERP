export const API_VERSION_CONSTANTS = {
  DEFAULT_VERSION: '1',
  SUPPORTED_VERSIONS: ['1'] as const,
  VERSION_HEADER: 'x-api-version',
} as const;

export const API_HEADER_CONSTANTS = {
  CORRELATION_ID: 'x-correlation-id',
  REQUEST_ID: 'x-request-id',
  TENANT_ID: 'x-tenant-id',
  API_KEY: 'x-api-key',
} as const;

export const API_RESPONSE_CONSTANTS = {
  BULK_MAX_ITEMS: 500,
  EXPORT_MAX_ROWS: 10000,
} as const;
