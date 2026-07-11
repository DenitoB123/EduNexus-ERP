import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../common/logger/logger.service';
import { DomainException } from './domain.exception';
import { StandardErrorResponse } from '../common/filters/http-exception.filter';

/**
 * Catches DomainException (and subclasses) specifically and maps them onto
 * the same StandardErrorResponse shape AllExceptionsFilter produces, plus
 * the domain `code` and `context` fields that filter doesn't know about.
 *
 * Registration order matters: register this filter BEFORE AllExceptionsFilter
 * in main.ts (`app.useGlobalFilters(new DomainExceptionFilter(logger),
 * new AllExceptionsFilter(logger))`) — Nest tries filters in the order given
 * and @Catch() narrows which one handles a given thrown value, so
 * AllExceptionsFilter remains the catch-all for everything that isn't a
 * DomainException.
 */
@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = (request.headers['x-correlation-id'] as string) ?? undefined;

    const body: StandardErrorResponse & { code: string; context?: Record<string, unknown> } = {
      statusCode: exception.httpStatus,
      message: exception.message,
      error: exception.code,
      code: exception.code,
      path: request.url,
      timestamp: new Date().toISOString(),
      context: exception.context,
      ...(correlationId && { correlationId }),
    };

    this.logger.error(
      `Domain exception [${exception.code}] — ${request.method} ${request.url} — ${exception.message}`,
      undefined,
      { correlationId, ...exception.context },
    );

    response.status(exception.httpStatus).json(body);
  }
}
