import { PrismaClient } from '@prisma/client';

export abstract class BaseSeed {
  abstract readonly name: string;

  abstract run(prisma: PrismaClient): Promise<void>;

  checksumInput(): string {
    return this.name;
  }
}
