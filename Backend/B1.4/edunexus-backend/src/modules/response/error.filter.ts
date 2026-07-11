import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

export interface StandardApiError {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  path: string;
  timestamp: string;
  correlationId?: string;
}

@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId =
      (request.headers['x-correlation-id'] as string) ?? undefined;

    const { statusCode, message, error } = this.resolve(exception);

    const body: StandardApiError = {
      success: false,
      statusCode,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(correlationId && { correlationId }),
    };

    this.logger.error(
      `[${error}] ${request.method} ${request.url} — ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(statusCode).json(body);
  }

  private resolve(exception: unknown): {
    statusCode: number;
    message: string;
    error: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : (res as { message?: string | string[] }).message
            ? Array.isArray((res as { message: string[] }).message)
              ? (res as { message: string[] }).message.join('; ')
              : String((res as { message: string }).message)
            : exception.message;

      return {
        statusCode: status,
        message,
        error: exception.name,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaKnown(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Database validation error',
        error: 'Bad Request',
      };
    }

    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message:
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : exception.message,
        error: 'Internal Server Error',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      error: 'Internal Server Error',
    };
  }

  private handlePrismaKnown(err: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
    error: string;
  } {
    switch (err.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `Unique constraint violation: ${(err.meta?.target as string[])?.join(', ')}`,
          error: 'Conflict',
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'Not Found',
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Foreign key constraint failed',
          error: 'Bad Request',
        };
      case 'P2014':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Relation constraint violation',
          error: 'Bad Request',
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error',
          error: 'Internal Server Error',
        };
    }
  }
}
