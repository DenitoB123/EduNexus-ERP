/**
 * audit-event.repository.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 *
 * Append-only (no version/soft-delete fields — see
 * schema.audit.additions.prisma), so this does not extend
 * BaseRepository, same reasoning as B2.18's WorkflowExecutionLogRepository:
 * a plain insert/search repository is the correct shape for an immutable
 * audit trail, not a workaround.
 *
 * NOTE ON COMPILATION: this repository casts `this.prisma.auditEvent` to
 * a local delegate shape. `auditEvent` only exists on the generated
 * Prisma Client once schema-additions/schema.audit.additions.prisma is
 * merged into schema.prisma and `npx prisma generate` is re-run — same
 * situation as every other parallel-milestone repository in this
 * codebase's history (D2.13, B2.18) that adds new Prisma models.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IAuditEvent, RecordAuditEventInput } from '../../interfaces/audit-event.interface';
import { IAuditRepository, IAuditSearchCriteria, IPagedResult } from '../../interfaces/audit-service.interface';

type CreateInput = RecordAuditEventInput & { actorType: string; legalHoldExempt: boolean };

interface AuditEventDelegate {
  create(args: { data: Record<string, unknown> }): Promise<IAuditEvent>;
  createMany(args: { data: Record<string, unknown>[] }): Promise<{ count: number }>;
  findMany(args: {
    where: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'>;
    skip?: number;
    take?: number;
  }): Promise<IAuditEvent[]>;
  count(args: { where: Record<string, unknown> }): Promise<number>;
  deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
}

@Injectable()
export class AuditEventRepository implements IAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get delegate(): AuditEventDelegate {
    return (this.prisma as unknown as { auditEvent: AuditEventDelegate }).auditEvent;
  }

  async create(event: CreateInput): Promise<IAuditEvent> {
    return this.delegate.create({ data: event });
  }

  /** Used by AuditService's batch flush — one INSERT for N buffered events instead of N round trips. */
  async createMany(events: CreateInput[]): Promise<number> {
    if (events.length === 0) return 0;
    const result = await this.delegate.createMany({ data: events });
    return result.count;
  }

  async search(criteria: IAuditSearchCriteria, page: number, pageSize: number): Promise<IPagedResult<IAuditEvent>> {
    const where = this.buildWhere(criteria);
    const [items, total] = await Promise.all([
      this.delegate.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.delegate.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async findByCorrelationId(tenantId: string, correlationId: string): Promise<IAuditEvent[]> {
    return this.delegate.findMany({
      where: { tenantId, correlationId },
      orderBy: { occurredAt: 'asc' },
    });
  }

  /** Used by ComplianceService.purgeExpired(). Never deletes rows with legalHoldExempt: true. */
  async deleteOlderThan(tenantId: string, category: string, cutoff: Date): Promise<number> {
    const result = await this.delegate.deleteMany({
      where: { tenantId, category, occurredAt: { lt: cutoff }, legalHoldExempt: false },
    });
    return result.count;
  }

  private buildWhere(criteria: IAuditSearchCriteria): Record<string, unknown> {
    const where: Record<string, unknown> = { tenantId: criteria.tenantId };
    if (criteria.actorId) where.actorId = criteria.actorId;
    if (criteria.action) where.action = criteria.action;
    if (criteria.category) where.category = criteria.category;
    if (criteria.entityType) where.entityType = criteria.entityType;
    if (criteria.entityId) where.entityId = criteria.entityId;
    if (criteria.module) where.module = criteria.module;
    if (criteria.severity) where.severity = criteria.severity;
    if (criteria.correlationId) where.correlationId = criteria.correlationId;
    if (criteria.dateFrom || criteria.dateTo) {
      where.occurredAt = {
        ...(criteria.dateFrom ? { gte: criteria.dateFrom } : {}),
        ...(criteria.dateTo ? { lte: criteria.dateTo } : {}),
      };
    }
    return where;
  }
}
