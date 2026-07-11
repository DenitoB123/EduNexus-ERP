import { createHash } from 'crypto';

export class SeedUtils {
  static checksum(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }
}
