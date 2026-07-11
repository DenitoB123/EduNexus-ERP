/**
 * compliance-purge.scheduler.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 *
 * Registers a daily cron job via the existing CronService
 * (infrastructure/scheduler) that runs ComplianceService.purgeExpired()
 * for every tenant with at least one active retention policy — no new
 * scheduling infrastructure introduced.
 *
 * Tenant enumeration: this codebase's audit/compliance layer works
 * entirely in terms of a `tenantId` string passed in by callers; there is
 * no existing "list all tenant IDs" query available to this module
 * without depending on the Institution/Organization domain (out of this
 * milestone's scope, and not yet part of B1.1–B2.12 per the D2.13
 * conversation earlier in this project's history). This scheduler
 * therefore purges per-tenant retention for whichever tenants have an
 * active ComplianceRetentionPolicy row — i.e. compliance is opt-in per
 * tenant by creating a policy, and purging only ever runs for tenants
 * that did so. A tenant with zero policies is simply never purged
 * (which is the safe default — no policy means no automatic deletion).
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { CronService } from '../../infrastructure/scheduler/cron.service';
import { ComplianceService } from './compliance.service';
import { RetentionPolicyRepository } from './repositories/compliance.repository';
import { AppLoggerService } from '../logger/app-logger.service';

const DAILY_AT_2AM = '0 2 * * *';

@Injectable()
export class CompliancePurgeScheduler implements OnModuleInit {
  constructor(
    private readonly cronService: CronService,
    private readonly complianceService: ComplianceService,
    private readonly retentionPolicyRepository: RetentionPolicyRepository,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('CompliancePurgeScheduler');
  }

  onModuleInit(): void {
    this.cronService.addCron('compliance.retention-purge', DAILY_AT_2AM, () => this.runPurgeForAllTenants());
  }

  private async runPurgeForAllTenants(): Promise<void> {
    const tenantIds = await this.retentionPolicyRepository.getDistinctTenantIdsWithActivePolicy();
    for (const tenantId of tenantIds) {
      try {
        const results = await this.complianceService.purgeExpired(tenantId);
        this.logger.log(`Retention purge completed for tenant ${tenantId}: ${JSON.stringify(results)}`);
      } catch (error) {
        this.logger.error(
          `Retention purge threw for tenant ${tenantId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }
}
