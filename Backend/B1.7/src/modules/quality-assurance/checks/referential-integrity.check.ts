import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { QaCheck, QaCheckResult } from '../qa.types';

/**
 * Spot-checks referential integrity that Postgres FKs already mostly
 * guarantee, but which soft-deletes (deletedAt) can quietly violate at the
 * *business logic* level — e.g. a User whose School was soft-deleted, which
 * a plain FK constraint won't catch since the School row still physically
 * exists.
 */
@Injectable()
export class ReferentialIntegrityCheck implements QaCheck {
  readonly name = 'referential-integrity';

  constructor(private readonly prisma: PrismaService) {}

  async run(): Promise<QaCheckResult> {
    const usersUnderDeletedSchools = await this.prisma.user.count({
      where: { school: { deletedAt: { not: null } } },
    });

    const filesUnderDeletedSchools = await this.prisma.storedFile.count({
      where: { school: { deletedAt: { not: null } } },
    });

    const issuesFound = usersUnderDeletedSchools + filesUnderDeletedSchools;

    return {
      checkName: this.name,
      status: issuesFound === 0 ? 'PASSED' : 'WARNING',
      issuesFound,
      details: { usersUnderDeletedSchools, filesUnderDeletedSchools },
    };
  }
}
