import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

/**
 * Thrown when an actor is authenticated but not authorized for a
 * specific action. Distinct from ForbiddenException only in intent —
 * both map to HTTP 403 — kept separate so future Guards can throw a
 * class named for what actually happened (authorization failure vs.
 * a generic forbidden response).
 */
export class AuthorizationException extends BaseException {
  constructor(action: string, resource?: string) {
    super(
      ERROR_CODES.FORBIDDEN,
      resource
        ? `You are not authorized to perform "${action}" on "${resource}"`
        : `You are not authorized to perform "${action}"`,
      HttpStatus.FORBIDDEN,
    );
  }
}
