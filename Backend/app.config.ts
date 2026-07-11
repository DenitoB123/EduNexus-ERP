import { registerAs } from '@nestjs/config';

export interface AppConfig {
  nodeEnv: string;
  name: string;
  port: number;
  url: string;
  globalPrefix: string;
  defaultApiVersion: string;
  corsOrigins: string[];
  shutdownTimeoutMs: number;
}

export default registerAs('app', (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  name: process.env.APP_NAME ?? 'EduNexus',
  port: parseInt(process.env.APP_PORT ?? '3000', 10),
  url: process.env.APP_URL ?? 'http://localhost:3000',
  globalPrefix: process.env.APP_GLOBAL_PREFIX ?? 'api',
  defaultApiVersion: process.env.APP_DEFAULT_API_VERSION ?? '1',
  corsOrigins: (process.env.APP_CORS_ORIGINS ?? '*').split(',').map((origin) => origin.trim()),
  shutdownTimeoutMs: parseInt(process.env.APP_SHUTDOWN_TIMEOUT_MS ?? '10000', 10),
}));
