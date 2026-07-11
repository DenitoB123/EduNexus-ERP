import { plainToInstance } from 'class-transformer';

export abstract class BaseDTO {
  static fromPlain<T extends BaseDTO>(this: new () => T, plain: Record<string, unknown>): T {
    return plainToInstance(this, plain, { excludeExtraneousValues: false });
  }
}
