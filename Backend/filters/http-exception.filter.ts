import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/app-logger.service';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('HttpExceptionFilter');
  }

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = exception.message;
    let details: unknown;
    let errorCode: string | undefined;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as Record<string, unknown>;
      message = (responseObj.message as string) ?? exception.message;
      details = responseObj.details ?? responseObj.message;
      errorCode = responseObj.code as string | undefined;
    }

    const errorPayload: ApiErrorResponse = {
      success: false,
      statusCode,
      path: request.url,
      timestamp: new Date().toISOString(),
      message: Array.isArray(message) ? message.join(', ') : message,
      error: errorCode ?? HttpStatus[statusCode] ?? 'Error',
      details,
    };

    this.logger.error(
      `${request.method} ${request.url} -> ${statusCode}: ${errorPayload.message}`,
      exception.stack,
    );

    response.status(statusCode).json(errorPayload);
  }
}
