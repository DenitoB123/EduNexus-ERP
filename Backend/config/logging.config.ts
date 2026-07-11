import { registerAs } from '@nestjs/config';

export interface LoggingConfig {
  level: string;
  toFile: boolean;
  dir: string;
}

export default registerAs('logging', (): LoggingConfig => ({
  level: process.env.LOG_LEVEL ?? 'info',
  toFile: process.env.LOG_TO_FILE === 'true',
  dir: process.env.LOG_DIR ?? 'logs',
}));
