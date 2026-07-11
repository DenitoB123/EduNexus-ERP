import { registerAs } from '@nestjs/config';

export interface SecurityConfig {
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  bcryptRounds: number;
  encryptionKeyHex: string;
  corsOrigins: string[];
  enableHsts: boolean;
  hstsMaxAgeSeconds: number;
  enableCsp: boolean;
}

export default registerAs('security', (): SecurityConfig => ({
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
  encryptionKeyHex: process.env.ENCRYPTION_KEY_HEX ?? '',
  corsOrigins: (process.env.CORS_ORIGINS ?? '*').split(',').map((o) => o.trim()),
  enableHsts: process.env.ENABLE_HSTS !== 'false',
  hstsMaxAgeSeconds: parseInt(process.env.HSTS_MAX_AGE_SECONDS ?? '31536000', 10),
  enableCsp: process.env.ENABLE_CSP !== 'false',
}));
