import { PrismaClient } from '@prisma/client';
import { SeedRunner } from './seed-runner';
import { BaseSeed } from './base-seed';

// Phase 1.2: infrastructure only — no business seeds are registered
// yet. Future phases append their BaseSeed implementations here.
const seeds: BaseSeed[] = [];

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const runner = new SeedRunner(prisma, seeds);
    await runner.runAll();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error while running seeds:', error);
  process.exit(1);
});
