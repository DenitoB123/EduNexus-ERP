/**
 * compliance.service.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 */

import { Injectable } from '@nestjs/common';
import { RetentionPolicyRepository, LegalHoldRepository } from './repositories/compliance.repository';
import { AuditEventRepository } from './repositories/audit-event.repository';
import { EntityChangeLogRepository } from './repositories/entity-change-log.repository';
import { AppLoggerService } from '../logger/app-logger.service';
import { CronService } from '../../infrastructure/scheduler/cron.service';
import { PrismaService } from '../../prisma/prisma.service';
import { IComplianceService, ILegalHold, IPurgeResult, IRetentionPolicy } from '../interfaces/compliance.interface';
import { AuditCategory } from '../interfaces/audit-event.interface';

@Injectable()
export class ComplianceService implements IComplianceService {
  constructor(
    private readonly retentionPolicyRepository: RetentionPolicyRepository,
    private readonly legalHoldRepository: LegalHoldRepository,
    private readonly auditEventRepository: AuditEventRepository,
    private readonly entityChangeLogRepository: EntityChangeLogRepository,
    private readonly prisma: PrismaService,
    private readonly cronService: CronService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('ComplianceService');
    // Daily at 02:00 — off-peak, well clear of any request traffic
    // pattern this codebase's other scheduled jobs assume. Registered
    // here (constructor-time, module-scoped singleton) rather than via a
    // decorator so the interval is visible in the *implementation*, not
    // hidden behind a magic annotation resolved by SchedulerModule's
    // discovery pass — consistent with how this codebase's own
    // TaskScheduler/CronService are meant to be driven (explicit
    // addCron() calls), not the alternative @Cron()-decorator style
    // NestJS also supports elsewhere in the ecosystem.
    this.cronService.addCron('audit-retention-purge', '0 2 * * *', () => this.purgeExpiredForAllTenants());
  }

  /**
   * Purges expired audit data across every tenant that has at least one
   * active retention policy. This is the ONE deliberate, narrow exception
   * to "every repository call is tenant-scoped" in this entire framework:
   * enumerating which tenants exist at all requires a cross-tenant read,
   * which the TenantRepository hierarchy correctly refuses to do by
   * design. Rather than weakening that hierarchy's guarantee for
   * everyone, this method does its own minimal, read-only, distinct-tenant
   * lookup directly against Prisma — bypassing the repository layer only
   * for the enumeration step — then calls the ordinary, tenant-scoped
   * `purgeExpired(tenantId)` per tenant, which goes through the normal
   * tenant-scoped path for every actual delete.
   */
  async purgeExpiredForAllTenants(): Promise<void> {
    let tenantIds: string[];
    try {
      const rows = await (
        this.prisma as unknown as {
          complianceRetentionPolicy: { findMany(args: unknown): Promise<{ tenantId: string }[]> };
        }
      ).complianceRetentionPolicy.findMany({
        where: { isActive: true, deletedAt: null },
        distinct: ['tenantId'],
        select: { tenantId: true },
      });
      tenantIds = rows.map((r) => r.tenantId);
    } catch (error) {
      this.logger.error(
        'Failed to enumerate tenants for scheduled retention purge',
        error instanceof Error ? error.stack : undefined,
      );
      return;
    }

    for (const tenantId of tenantIds) {
      const results = await this.purgeExpired(tenantId);
      const totalDeleted = results.reduce((sum, r) => sum + r.auditEventsDeleted + r.entityChangeLogsDeleted, 0);
      if (totalDeleted > 0) {
        this.logger.log(`Retention purge for tenant ${tenantId} deleted ${totalDeleted} rows across ${results.length} categories`);
      }
    }
  }

  async setRetentionPolicy(
    tenantId: string,
    category: AuditCategory,
    retentionDays: number,
    actorId?: string,
  ): Promise<IRetentionPolicy> {
    const existing = await this.retentionPolicyRepository.findByCategory(tenantId, category);
    if (existing) {
      return this.retentionPolicyRepository.update(existing.id, { retentionDays, isActive: true }, tenantId, actorId);
    }
    return this.retentionPolicyRepository.create({ category, retentionDays, isActive: true }, tenantId, actorId);
  }

  async getRetentionPolicy(tenantId: string, category: AuditCategory): Promise<IRetentionPolicy | null> {
    return this.retentionPolicyRepository.findByCategory(tenantId, category);
  }

  async placeLegalHold(
    tenantId: string,
    reason: string,
    entityType?: string,
    entityId?: string,
    actorId?: string,
  ): Promise<ILegalHold> {
    return this.legalHoldRepository.create({ reason, entityType, entityId, isActive: true }, tenantId, actorId);
  }

  async releaseLegalHold(tenantId: string, holdId: string, actorId?: string): Promise<ILegalHold> {
    return this.legalHoldRepository.update(
      holdId,
      { isActive: false, releasedAt: new Date(), releasedBy: actorId },
      tenantId,
      actorId,
    );
  }

  async isUnderLegalHold(tenantId: string, entityType: string, entityId: string): Promise<boolean> {
    const holds = await this.legalHoldRepository.findActiveForEntity(tenantId, entityType, entityId);
    if (holds.length > 0) return true;
    // A tenant-wide hold (no entityType/entityId) also covers everything in that tenant.
    const tenantWide = await this.legalHoldRepository.findActiveForTenant(tenantId);
    return tenantWide.some((h) => !h.entityType && !h.entityId);
  }

  /**
   * Deletes AuditEvent/EntityChangeLog rows older than each active
   * category's retention policy. Rows flagged `legalHoldExempt: true`
   * (set at write time — see audit.interceptor.ts / activity-logger.service.ts
   * integration points for where a caller would set that) are never
   * deleted regardless of age. This does NOT currently cross-reference
   * individual LegalHold records against individual AuditEvent rows by
   * entity — that would require a join this schema doesn't optimize for
   * (AuditEvent has no FK to LegalHold). The `legalHoldExempt` boolean
   * flag is the mechanism: callers that know an event relates to a
   * held entity should set it explicitly. Documented as a known
   * simplification, not silently glossed over.
   */
  async purgeExpired(tenantId: string): Promise<IPurgeResult[]> {
    const policies = await this.retentionPolicyRepository.findAllActive(tenantId);
    const results: IPurgeResult[] = [];

    for (const policy of policies) {
      const cutoff = new Date(Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000);
      try {
        const auditEventsDeleted = await this.auditEventRepository.deleteOlderThan(tenantId, policy.category, cutoff);
        const entityChangeLogsDeleted =
          policy.category === AuditCategory.DATA_CHANGE
            ? await this.entityChangeLogRepository.deleteOlderThan(tenantId, cutoff)
            : 0;

        results.push({ category: policy.category, auditEventsDeleted, entityChangeLogsDeleted, skippedDueToLegalHold: 0 });
      } catch (error) {
        this.logger.error(
          `Retention purge failed for tenant ${tenantId}, category ${policy.category}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return results;
  }
}
