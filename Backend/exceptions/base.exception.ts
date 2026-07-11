import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes.constants';

export abstract class BaseException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    statusCode: HttpStatus,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, statusCode);
  }
}
