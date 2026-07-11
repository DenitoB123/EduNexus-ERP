/**
 * audit-metadata.util.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 *
 * Extracts the request metadata AuditInterceptor attaches to every
 * captured event (ipAddress/userAgent/method/url/statusCode). Does not
 * duplicate correlation ID resolution — that's CorrelationIdUtil
 * (infrastructure/monitoring/correlation-id.util.ts), already used by
 * RequestContextMiddleware; this util is called alongside it, not instead
 * of it.
 */

import { Request, Response } from 'express';

export interface IRequestMetadata {
  ipAddress?: string;
  userAgent?: string;
  method: string;
  url: string;
  statusCode?: number;
}

export class AuditMetadataUtil {
  static extract(request: Request, response?: Response): IRequestMetadata {
    return {
      ipAddress: request.ip ?? (request.socket?.remoteAddress || undefined),
      userAgent: request.headers['user-agent'],
      method: request.method,
      url: request.originalUrl ?? request.url,
      statusCode: response?.statusCode,
    };
  }
}
