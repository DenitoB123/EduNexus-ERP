/**
 * entity-change-log.repository.ts
 *
 * B2.13 — Enterprise Audit, Activity Logging & Compliance Framework
 * See audit-event.repository.ts for the compilation note re: generated
 * Prisma Client types.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IEntityChangeLog, RecordEntityChangeInput } from '../../interfaces/audit-event.interface';

interface EntityChangeLogDelegate {
  create(args: { data: Record<string, unknown> }): Promise<IEntityChangeLog>;
  findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, 'asc' | 'desc'> }): Promise<IEntityChangeLog[]>;
  deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
}

@Injectable()
export class EntityChangeLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get delegate(): EntityChangeLogDelegate {
    return (this.prisma as unknown as { entityChangeLog: EntityChangeLogDelegate }).entityChangeLog;
  }

  async create(entry: RecordEntityChangeInput): Promise<IEntityChangeLog> {
    return this.delegate.create({ data: entry });
  }

  async findByEntity(tenantId: string, entityType: string, entityId: string): Promise<IEntityChangeLog[]> {
    return this.delegate.findMany({
      where: { tenantId, entityType, entityId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async deleteOlderThan(tenantId: string, cutoff: Date): Promise<number> {
    const result = await this.delegate.deleteMany({ where: { tenantId, occurredAt: { lt: cutoff } } });
    return result.count;
  }
}
