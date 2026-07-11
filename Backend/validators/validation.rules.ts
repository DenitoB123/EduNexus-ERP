export const VALIDATION_RULES = {
  STRONG_PASSWORD_PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{12,}$/,
  SLUG_PATTERN: /^[a-z0-9]+(-[a-z0-9]+)*$/,
  E164_PHONE_PATTERN: /^\+[1-9]\d{6,14}$/,
} as const;
