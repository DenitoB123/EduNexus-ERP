import { Injectable } from '@nestjs/common';
import { XssProtectionHelper } from './xss-protection.helper';

@Injectable()
export class InputSanitizerService {
  sanitizeString(value: string): string {
    return XssProtectionHelper.sanitize(value);
  }

  sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.sanitizeString(value);
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          typeof item === 'string' ? this.sanitizeString(item) : item,
        );
      } else {
        result[key] = value;
      }
    }

    return result as T;
  }
}
