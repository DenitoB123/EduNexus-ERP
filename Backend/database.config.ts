import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  url: string;
  logging: boolean;
  pool: {
    min: number;
    max: number;
  };
  connectTimeoutMs: number;
  queryTimeoutMs: number;
  ssl: {
    enabled: boolean;
    rejectUnauthorized: boolean;
  };
  retry: {
    attempts: number;
    delayMs: number;
  };
  slowQueryThresholdMs: number;
}

export default registerAs('database', (): DatabaseConfig => ({
  url: process.env.DATABASE_URL as string,
  logging: process.env.DATABASE_LOGGING === 'true',
  pool: {
    min: parseInt(process.env.DATABASE_POOL_MIN ?? '2', 10),
    max: parseInt(process.env.DATABASE_POOL_MAX ?? '10', 10),
  },
  connectTimeoutMs: parseInt(process.env.DATABASE_CONNECT_TIMEOUT_MS ?? '5000', 10),
  queryTimeoutMs: parseInt(process.env.DATABASE_QUERY_TIMEOUT_MS ?? '15000', 10),
  ssl: {
    enabled: process.env.DATABASE_SSL === 'true',
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
  },
  retry: {
    attempts: parseInt(process.env.DATABASE_RETRY_ATTEMPTS ?? '5', 10),
    delayMs: parseInt(process.env.DATABASE_RETRY_DELAY_MS ?? '2000', 10),
  },
  slowQueryThresholdMs: parseInt(process.env.DATABASE_SLOW_QUERY_THRESHOLD_MS ?? '500', 10),
}));
