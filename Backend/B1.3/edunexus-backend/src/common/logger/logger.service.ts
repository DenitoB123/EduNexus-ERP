import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  requestId?: string;
  [key: string]: unknown;
}

@Injectable({ scope: Scope.DEFAULT })
export class AppLoggerService implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL ?? 'debug',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
      ),
      defaultMeta: {
        service: 'edunexus-api',
        env: process.env.NODE_ENV ?? 'development',
      },
      transports: AppLoggerService.buildTransports(),
    });
  }

  // ── LoggerService interface ────────────────────────────────────────────────

  log(message: string, context?: string | LogContext): void {
    this.logger.info(message, this.formatMeta(context));
  }

  error(
    message: string,
    trace?: string,
    context?: string | LogContext,
  ): void {
    this.logger.error(message, {
      ...this.formatMeta(context),
      trace,
    });
  }

  warn(message: string, context?: string | LogContext): void {
    this.logger.warn(message, this.formatMeta(context));
  }

  debug(message: string, context?: string | LogContext): void {
    this.logger.debug(message, this.formatMeta(context));
  }

  verbose(message: string, context?: string | LogContext): void {
    this.logger.verbose(message, this.formatMeta(context));
  }

  // ── Extended helpers ───────────────────────────────────────────────────────

  info(message: string, context?: string | LogContext): void {
    this.log(message, context);
  }

  logHttp(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext,
  ): void {
    this.logger.info(`${method} ${url} ${statusCode} — ${duration}ms`, {
      ...this.formatMeta(context),
      type: 'http',
      method,
      url,
      statusCode,
      duration,
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private formatMeta(context?: string | LogContext): Record<string, unknown> {
    if (!context) return {};
    if (typeof context === 'string') return { context };
    return { context: context };
  }

  private static buildTransports(): winston.transport[] {
    const transports: winston.transport[] = [];
    const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';

    // ── Console (colorized in dev, JSON in prod) ──────────────────────────
    if (isDev) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.printf(({ timestamp, level, message, context, trace }) => {
              const ctx = context ? ` [${typeof context === 'object' ? JSON.stringify(context) : context}]` : '';
              const traceStr = trace ? `\n${trace}` : '';
              return `${timestamp} ${level}${ctx}: ${message}${traceStr}`;
            }),
          ),
        }),
      );
    } else {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    // ── Rotating file — all logs ──────────────────────────────────────────
    transports.push(
      new (winston.transports as any).DailyRotateFile({
        dirname: process.env.LOG_DIR ?? 'logs',
        filename: 'edunexus-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: process.env.LOG_MAX_SIZE ?? '20m',
        maxFiles: process.env.LOG_MAX_FILES ?? '14d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );

    // ── Rotating file — errors only ───────────────────────────────────────
    transports.push(
      new (winston.transports as any).DailyRotateFile({
        dirname: process.env.LOG_DIR ?? 'logs',
        filename: 'edunexus-error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        zippedArchive: true,
        maxSize: process.env.LOG_MAX_SIZE ?? '20m',
        maxFiles: process.env.LOG_MAX_FILES ?? '14d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );

    return transports;
  }
}
