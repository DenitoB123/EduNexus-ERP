import { randomBytes, randomInt } from 'crypto';

export class RandomUtil {
  static int(min: number, max: number): number {
    return randomInt(min, max + 1);
  }

  static token(length = 32): string {
    return randomBytes(length).toString('hex');
  }

  static numericCode(length = 6): string {
    let code = '';
    for (let i = 0; i < length; i += 1) {
      code += randomInt(0, 10).toString();
    }
    return code;
  }
}
