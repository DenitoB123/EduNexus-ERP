/**
 * compliance.repository.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 *
 * ComplianceRetentionPolicy and LegalHold are ordinary versioned,
 * soft-deletable business entities, so — per FileAssetRepository's
 * example (the one existing precedent in this codebase) — these extend
 * `SoftDeleteRepository` (the top of the PrismaRepository ->
 * TenantRepository -> AuditableRepository -> SoftDeleteRepository chain
 * documented in common/repositories/soft-delete.repository.ts), NOT
 * common/base/BaseRepository. That second, simpler hierarchy exists
 * elsewhere in this codebase but has no real business-repository usage —
 * SoftDeleteRepository is the one its own documentation says future
 * business modules should extend.
 *
 * Custom finder methods use `this.delegate` (protected, inherited from
 * PrismaRepository) directly rather than re-casting `this.prisma` per
 * call, consistent with how the rest of the hierarchy accesses Prisma.
 *
 * NOTE ON COMPILATION: `prisma.complianceRetentionPolicy`/`prisma.legalHold`
 * only exist on the generated Prisma Client once
 * schema-additions/schema.audit.additions.prisma is merged into
 * schema.prisma and `npx prisma generate` is re-run.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SoftDeleteRepository } from '../../repositories/soft-delete.repository';
import { PrismaFullModelDelegate } from '../../repositories/interfaces/prisma-full-delegate.interface';
import { BaseModel } from '../../../database/interfaces/base-model.interface';
import { IRetentionPolicy, ILegalHold } from '../../interfaces/compliance.interface';

type RetentionPolicyRecord = IRetentionPolicy & BaseModel;

@Injectable()
export class RetentionPolicyRepository extends SoftDeleteRepository<RetentionPolicyRecord> {
  protected readonly modelName = 'ComplianceRetentionPolicy';
  protected readonly allowedFilterFields = ['category', 'isActive'];
  protected readonly allowedSearchFields: string[] = [];

  constructor(prisma: PrismaService) {
    super(
      (prisma as unknown as { complianceRetentionPolicy: PrismaFullModelDelegate<RetentionPolicyRecord> })
        .complianceRetentionPolicy,
    );
  }

  async findByCategory(tenantId: string, category: string): Promise<RetentionPolicyRecord | null> {
    return this.delegate.findFirst({ where: { tenantId, category, deletedAt: null } });
  }

  async findAllActive(tenantId: string): Promise<RetentionPolicyRecord[]> {
    return this.delegate.findMany({ where: { tenantId, isActive: true, deletedAt: null } });
  }

  /**
   * Used by CompliancePurgeScheduler to enumerate which tenants have opted
   * into compliance retention (see that file's header comment on why
   * purging is scoped to tenants with an active policy rather than "all
   * tenants" — there's no tenant-enumeration query available to this
   * module otherwise). Deduplicates in application code rather than using
   * Prisma's `distinct` — `distinct` isn't part of the narrower
   * PrismaFullModelDelegate contract this hierarchy shares across every
   * repository, and the row count here (one row per tenant per audit
   * category) is small enough that an in-memory Set is the simpler,
   * equally-correct choice over widening that shared interface for one
   * caller.
   */
  async getDistinctTenantIdsWithActivePolicy(): Promise<string[]> {
    const rows = await this.delegate.findMany({ where: { isActive: true, deletedAt: null } });
    const tenantIds = new Set<string>();
    for (const row of rows) {
      tenantIds.add((row as unknown as { tenantId: string }).tenantId);
    }
    return Array.from(tenantIds);
  }
}

type LegalHoldRecord = ILegalHold & BaseModel;

@Injectable()
export class LegalHoldRepository extends SoftDeleteRepository<LegalHoldRecord> {
  protected readonly modelName = 'LegalHold';
  protected readonly allowedFilterFields = ['entityType', 'entityId', 'isActive'];
  protected readonly allowedSearchFields: string[] = [];

  constructor(prisma: PrismaService) {
    super((prisma as unknown as { legalHold: PrismaFullModelDelegate<LegalHoldRecord> }).legalHold);
  }

  async findActiveForEntity(tenantId: string, entityType: string, entityId: string): Promise<LegalHoldRecord[]> {
    return this.delegate.findMany({ where: { tenantId, entityType, entityId, isActive: true, deletedAt: null } });
  }

  async findActiveForTenant(tenantId: string): Promise<LegalHoldRecord[]> {
    return this.delegate.findMany({ where: { tenantId, isActive: true, deletedAt: null } });
  }
}
