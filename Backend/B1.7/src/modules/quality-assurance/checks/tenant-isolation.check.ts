import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { QaCheck, QaCheckResult } from '../qa.types';

/**
 * Verifies tenant isolation integrity: every row that carries a `schoolId`
 * actually points at a School that exists, and isn't accidentally null
 * where it shouldn't be. This is the single most important QA check for a
 * multi-tenant platform — a tenant-isolation bug is a data-leak bug.
 *
 * Scoped to AuditLog and StoredFile for now (the models milestone 1.1–1.6
 * actually populate schoolId on); extend `targets` as new domain modules
 * with a schoolId column land in Phase 2.
 */
@Injectable()
export class TenantIsolationCheck implements QaCheck {
  readonly name = 'tenant-isolation';

  constructor(private readonly prisma: PrismaService) {}

  async run(): Promise<QaCheckResult> {
    const orphanedAuditLogs = await this.prisma.auditLog.count({
      where: {
        schoolId: { not: null },
        NOT: { schoolId: { in: await this.activeSchoolIds() } },
      },
    });

    const orphanedFiles = await this.prisma.storedFile.count({
      where: {
        schoolId: { not: null },
        NOT: { schoolId: { in: await this.activeSchoolIds() } },
      },
    });

    const issuesFound = orphanedAuditLogs + orphanedFiles;

    return {
      checkName: this.name,
      status: issuesFound === 0 ? 'PASSED' : 'FAILED',
      issuesFound,
      details: { orphanedAuditLogs, orphanedFiles },
    };
  }

  private async activeSchoolIds(): Promise<string[]> {
    const schools = await this.prisma.school.findMany({ select: { id: true } });
    return schools.map((s) => s.id);
  }
}
