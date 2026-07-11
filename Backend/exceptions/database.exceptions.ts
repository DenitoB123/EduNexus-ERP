import { HttpException, HttpStatus } from '@nestjs/common';

export class DatabaseException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    details?: unknown,
    public readonly cause?: unknown,
  ) {
    super({ message, details }, statusCode);
  }
}

export class OptimisticLockException extends DatabaseException {
  constructor(model: string, id: string) {
    super(
      `${model} with id ${id} was modified by another process. Please refresh and try again.`,
      HttpStatus.CONFLICT,
    );
  }
}

export class RecordNotFoundException extends DatabaseException {
  constructor(model: string, id: string) {
    super(`${model} with id ${id} was not found`, HttpStatus.NOT_FOUND);
  }
}

export class TenantContextMissingException extends DatabaseException {
  constructor() {
    super('Tenant context is required but was not provided', HttpStatus.BAD_REQUEST);
  }
}

export class DatabaseConnectionException extends DatabaseException {
  constructor(message: string) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

export class DatabaseErrorHandler {
  static isRetriable(error: unknown): boolean {
    const code = (error as { code?: string })?.code;
    return code !== undefined && ['P1000', 'P1001', 'P1002', 'P1008', 'P1017'].includes(code);
  }

  static wrap(error: unknown, context: string): DatabaseException {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    return new DatabaseException(`${context}: ${message}`, undefined, undefined, error);
  }
}
