import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppLoggerService } from '../logger/logger.service';
import { StandardErrorResponse } from './http-exception.filter';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId =
      (request.headers['x-correlation-id'] as string) ?? undefined;

    const { statusCode, message, error } =
      this.resolveErrorDetails(exception);

    const body: StandardErrorResponse = {
      statusCode,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(correlationId && { correlationId }),
    };

    this.logger.error(
      `Unhandled Exception [${error}] — ${request.method} ${request.url} — ${message}`,
      exception instanceof Error ? exception.stack : undefined,
      { correlationId, statusCode },
    );

    response.status(statusCode).json(body);
  }

  private resolveErrorDetails(exception: unknown): {
    statusCode: number;
    message: string;
    error: string;
  } {
    // ── Prisma known request errors ───────────────────────────────────────
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception);
    }

    // ── Prisma validation errors ──────────────────────────────────────────
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Database validation error',
        error: 'Bad Request',
      };
    }

    // ── Generic JS errors ─────────────────────────────────────────────────
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

  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
    error: string;
  } {
    switch (error.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `Unique constraint violation on field(s): ${(error.meta?.target as string[])?.join(', ')}`,
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
          message: 'Relation violation',
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
