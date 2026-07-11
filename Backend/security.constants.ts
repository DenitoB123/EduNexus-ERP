export const SECURITY_CONSTANTS = {
  REQUEST_ID_HEADER: 'x-request-id',
  CORRELATION_ID_HEADER: 'x-correlation-id',
  REQUEST_FINGERPRINT_HEADER: 'x-request-fingerprint',
  MAX_PAYLOAD_BYTES: 10 * 1024 * 1024,
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_MAX_REQUESTS: 100,
  BCRYPT_ROUNDS: 12,
  AES_KEY_SIZE_BYTES: 32,
} as const;

export const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  connectSrc: ["'self'"],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  frameSrc: ["'none'"],
  formAction: ["'self'"],
  upgradeInsecureRequests: [],
} as const;
