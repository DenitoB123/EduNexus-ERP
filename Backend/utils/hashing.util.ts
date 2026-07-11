import { createHash } from 'crypto';

export class HashingUtil {
  static sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  static md5(value: string): string {
    return createHash('md5').update(value).digest('hex');
  }
}
