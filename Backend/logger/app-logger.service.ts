import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';
import { AppConfigService } from '../config/app-config.service';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService implements LoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(private readonly configService: AppConfigService) {
    const { level, toFile, dir } = this.configService.logging;

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: this.configService.isProduction
          ? this.jsonFormat()
          : this.prettyFormat(),
      }),
    ];

    if (toFile) {
      transports.push(
        new winston.transports.File({
          filename: `${dir}/error.log`,
          level: 'error',
          format: this.jsonFormat(),
        }),
        new winston.transports.File({
          filename: `${dir}/combined.log`,
          format: this.jsonFormat(),
        }),
      );
    }

    this.logger = winston.createLogger({
      level,
      transports,
    });
  }

  setContext(context: string): void {
    this.context = context;
  }

  private jsonFormat() {
    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );
  }

  private prettyFormat() {
    return winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, context, stack, ...meta }) => {
        const ctx = context ?? this.context ?? 'Application';
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        const base = `${timestamp} [${level.toUpperCase()}] [${ctx}] ${message}${metaStr}`;
        return stack ? `${base}\n${stack}` : base;
      }),
    );
  }

  log(message: any, context?: string): void {
    this.logger.info(message, { context: context ?? this.context });
  }

  error(message: any, trace?: string, context?: string): void {
    this.logger.error(message, { context: context ?? this.context, stack: trace });
  }

  warn(message: any, context?: string): void {
    this.logger.warn(message, { context: context ?? this.context });
  }

  debug(message: any, context?: string): void {
    this.logger.debug(message, { context: context ?? this.context });
  }

  verbose(message: any, context?: string): void {
    this.logger.verbose(message, { context: context ?? this.context });
  }

  http(message: string, meta?: Record<string, unknown>): void {
    this.logger.log('http', message, { context: this.context, ...meta });
  }
}
