export const SECURITY_CONSTANTS = {
  // ── Hashing ──────────────────────────────────────────────────────────────
  BCRYPT_ROUNDS: 12,

  // ── Symmetric encryption (AES-256-GCM) ──────────────────────────────────
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  ENCRYPTION_KEY_LENGTH: 32, // bytes (256 bits)
  ENCRYPTION_IV_LENGTH: 12, // bytes — recommended for GCM
  ENCRYPTION_AUTH_TAG_LENGTH: 16, // bytes

  // ── Tokens ───────────────────────────────────────────────────────────────
  RANDOM_TOKEN_BYTES: 32,
  OTP_LENGTH: 6,
  OTP_TTL_SECONDS: 5 * 60,
  PASSWORD_RESET_TTL_SECONDS: 60 * 60,
  EMAIL_VERIFICATION_TTL_SECONDS: 24 * 60 * 60,

  // ── HMAC ─────────────────────────────────────────────────────────────────
  HMAC_ALGORITHM: 'sha256',
} as const;

export const SECURITY_ERRORS = {
  ENCRYPTION_KEY_MISSING: 'ENCRYPTION_KEY is not configured',
  INVALID_CIPHERTEXT: 'Ciphertext is malformed or has been tampered with',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Token is invalid',
} as const;
