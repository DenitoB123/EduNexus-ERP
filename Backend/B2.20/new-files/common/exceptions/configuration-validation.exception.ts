import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

/**
 * Thrown by BootstrapDiagnosticsService when ConfigurationValidatorService
 * reports one or more 'error'-severity issues. Aborts boot — see
 * main.ts. Not expected to surface through an HTTP response (the
 * process never finishes starting), but extends BaseException like
 * every other exception in this codebase for consistency and in case
 * a future admin endpoint re-runs validation on a live process.
 */
export class ConfigurationValidationException extends BaseException {
  constructor(message: string, details?: unknown) {
    super(ERROR_CODES.CONFIGURATION_INVALID, message, HttpStatus.INTERNAL_SERVER_ERROR, details);
  }
}
