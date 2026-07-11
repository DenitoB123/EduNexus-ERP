import { randomUUID } from 'crypto';
import { RandomUtil } from '../utils/random.util';

export class FakeDataBuilder {
  static uuid(): string {
    return randomUUID();
  }

  static name(): string {
    const first = ['Alice', 'Bob', 'Carol', 'Diana', 'Evan', 'Fiona', 'George'];
    const last = ['Smith', 'Jones', 'Brown', 'Williams', 'Taylor', 'Lee', 'Chen'];
    return `${first[RandomUtil.int(0, first.length - 1)]} ${last[RandomUtil.int(0, last.length - 1)]}`;
  }

  static email(name?: string): string {
    const handle = name
      ? name.toLowerCase().replace(/\s+/g, '.')
      : `user${RandomUtil.int(1000, 9999)}`;
    return `${handle}@test.edunexus.io`;
  }

  static phone(): string {
    return `+1${RandomUtil.int(2000000000, 9999999999)}`;
  }

  static date(offsetDays = 0): Date {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d;
  }

  static numericCode(length = 6): string {
    return RandomUtil.numericCode(length);
  }
}
