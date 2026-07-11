import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/app-logger.service';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('AllExceptionsFilter');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    const error = exception instanceof Error ? exception : new Error('Unknown error');

    const errorPayload: ApiErrorResponse = {
      success: false,
      statusCode,
      path: request.url,
      timestamp: new Date().toISOString(),
      message: 'An unexpected internal server error occurred',
      error: 'Internal Server Error',
    };

    this.logger.error(`${request.method} ${request.url} -> Unhandled: ${error.message}`, error.stack);

    response.status(statusCode).json(errorPayload);
  }
}
