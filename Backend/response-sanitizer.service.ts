import { Injectable } from '@nestjs/common';
import { StringUtil } from '../../common/utils/string.util';

const SENSITIVE_FIELD_NAMES = new Set([
  'password',
  'passwordHash',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'privateKey',
  'creditCard',
  'cvv',
  'ssn',
]);

@Injectable()
export class ResponseSanitizerService {
  maskSensitiveFields<T extends Record<string, unknown>>(obj: T): T {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_FIELD_NAMES.has(key)) {
        result[key] = '[REDACTED]';
      } else if (key.toLowerCase() === 'email' && typeof value === 'string') {
        result[key] = StringUtil.maskEmail(value);
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.maskSensitiveFields(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result as T;
  }
}
