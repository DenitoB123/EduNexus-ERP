import { randomUUID } from 'crypto';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class UuidUtil {
  static generate(): string {
    return randomUUID();
  }

  static isValid(value: string): boolean {
    return UUID_PATTERN.test(value);
  }
}
