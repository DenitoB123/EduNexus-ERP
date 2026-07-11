import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

export class ConfigurationException extends BaseException {
  constructor(message: string) {
    super(ERROR_CODES.INTERNAL_ERROR, message, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  static missingEnvVar(key: string): ConfigurationException {
    return new ConfigurationException(`Missing required configuration value "${key}"`);
  }
}
