import { PrismaClient } from '@prisma/client';
import { BaseSeed } from './base-seed';
import { SeedUtils } from './seed.utils';
import { SeedConfig, DEFAULT_SEED_CONFIG } from './seed.config';

export class SeedRunner {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly seeds: BaseSeed[],
    private readonly config: SeedConfig = DEFAULT_SEED_CONFIG,
  ) {}

  async runAll(): Promise<void> {
    for (const seed of this.seeds) {
      await this.runOne(seed);
    }
  }

  private async runOne(seed: BaseSeed): Promise<void> {
    const checksum = SeedUtils.checksum(seed.checksumInput());

    const existing = await this.prisma.seedLog.findUnique({ where: { name: seed.name } });

    if (existing && existing.checksum === checksum) {
      if (this.config.logProgress) {
        // eslint-disable-next-line no-console
        console.log(`[seed] skipping "${seed.name}" — already executed with matching checksum`);
      }
      return;
    }

    const startedAt = Date.now();

    try {
      if (this.config.logProgress) {
        // eslint-disable-next-line no-console
        console.log(`[seed] running "${seed.name}"...`);
      }

      await seed.run(this.prisma);

      const durationMs = Date.now() - startedAt;

      await this.prisma.seedLog.upsert({
        where: { name: seed.name },
        create: { name: seed.name, checksum, durationMs },
        update: { checksum, durationMs, executedAt: new Date() },
      });

      if (this.config.logProgress) {
        // eslint-disable-next-line no-console
        console.log(`[seed] completed "${seed.name}" in ${durationMs}ms`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[seed] failed "${seed.name}":`, error);
      if (this.config.failFast) throw error;
    }
  }
}
