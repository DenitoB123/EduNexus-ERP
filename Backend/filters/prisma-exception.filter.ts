import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/app-logger.service';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

const PRISMA_ERROR_STATUS_MAP: Record<string, HttpStatus> = {
  P2000: HttpStatus.BAD_REQUEST,
  P2001: HttpStatus.NOT_FOUND,
  P2002: HttpStatus.CONFLICT,
  P2003: HttpStatus.BAD_REQUEST,
  P2004: HttpStatus.BAD_REQUEST,
  P2005: HttpStatus.BAD_REQUEST,
  P2006: HttpStatus.BAD_REQUEST,
  P2007: HttpStatus.BAD_REQUEST,
  P2011: HttpStatus.BAD_REQUEST,
  P2012: HttpStatus.BAD_REQUEST,
  P2014: HttpStatus.BAD_REQUEST,
  P2025: HttpStatus.NOT_FOUND,
};

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('PrismaExceptionFilter');
  }

  catch(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error occurred';
    let details: unknown;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      statusCode = PRISMA_ERROR_STATUS_MAP[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
      message = this.mapErrorMessage(exception.code, exception.meta);
      details = { code: exception.code, meta: exception.meta };
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided to the database query';
    }

    const errorPayload: ApiErrorResponse = {
      success: false,
      statusCode,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
      error: HttpStatus[statusCode] ?? 'Error',
      details,
    };

    this.logger.error(
      `${request.method} ${request.url} -> Prisma error: ${message}`,
      exception.stack,
    );

    response.status(statusCode).json(errorPayload);
  }

  private mapErrorMessage(code: string, meta?: Record<string, unknown>): string {
    switch (code) {
      case 'P2002':
        return `A record with this ${(meta?.target as string[])?.join(', ') ?? 'value'} already exists`;
      case 'P2025':
        return 'The requested record was not found';
      case 'P2003':
        return 'Operation failed due to a related record constraint';
      default:
        return 'A database error occurred while processing the request';
    }
  }
}
