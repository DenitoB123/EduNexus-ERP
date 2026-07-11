// ── Pagination ────────────────────────────────────────────────────────────────
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// ── Tenant ────────────────────────────────────────────────────────────────────
export const TENANT_HEADER = 'x-tenant-id';
export const SCHOOL_ID_HEADER = 'x-school-id';
export const CORRELATION_ID_HEADER = 'x-correlation-id';

// ── Context ───────────────────────────────────────────────────────────────────
export const CONTEXT_SERVICE = 'CONTEXT_SERVICE';

// ── Roles ─────────────────────────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
  STAFF: 'STAFF',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// ── Date formats ─────────────────────────────────────────────────────────────
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

// ── Upload limits ─────────────────────────────────────────────────────────────
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// ── Cache TTLs (seconds) ──────────────────────────────────────────────────────
export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  DAY: 86400,
} as const;

// ── Token expiry ──────────────────────────────────────────────────────────────
export const TOKEN_EXPIRY = {
  ACCESS: '15m',
  REFRESH: '7d',
  RESET_PASSWORD: '1h',
  EMAIL_VERIFY: '24h',
} as const;

// ── API version ───────────────────────────────────────────────────────────────
export const API_VERSION = 'v1';
export const API_PREFIX = `api/${API_VERSION}`;
