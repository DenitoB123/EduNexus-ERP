import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/logger.service';

export interface StandardErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
  correlationId?: string;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const message =
      typeof exceptionResponse === 'object' &&
      'message' in (exceptionResponse as object)
        ? (exceptionResponse as { message: string | string[] }).message
        : exception.message;

    const error =
      typeof exceptionResponse === 'object' &&
      'error' in (exceptionResponse as object)
        ? (exceptionResponse as { error: string }).error
        : HttpStatus[statusCode] ?? 'Unknown Error';

    const correlationId =
      (request.headers['x-correlation-id'] as string) ?? undefined;

    const body: StandardErrorResponse = {
      statusCode,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(correlationId && { correlationId }),
    };

    this.logger.warn(
      `HTTP ${statusCode} — ${request.method} ${request.url} — ${JSON.stringify(message)}`,
      { correlationId, statusCode },
    );

    response.status(statusCode).json(body);
  }
}
