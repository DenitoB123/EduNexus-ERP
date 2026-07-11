import { Injectable } from '@nestjs/common';
import { RandomUtil } from '../../common/utils/random.util';
import { randomUUID } from 'crypto';

@Injectable()
export class SecureRandomGenerator {
  token(length = 32): string {
    return RandomUtil.token(length);
  }

  numericCode(length = 6): string {
    return RandomUtil.numericCode(length);
  }

  uuid(): string {
    return randomUUID();
  }

  keyHex(bytes = 32): string {
    const { randomBytes } = require('crypto') as typeof import('crypto');
    return randomBytes(bytes).toString('hex');
  }
}
