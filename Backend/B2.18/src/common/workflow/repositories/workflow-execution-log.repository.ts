/**
 * workflow-execution-log.repository.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Same reasoning as approval-decision.repository.ts: append-only audit
 * rows, not a BaseRepository-shaped versioned/soft-deletable aggregate.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IWorkflowExecutionLog } from '../../interfaces/workflow-instance.interface';

@Injectable()
export class WorkflowExecutionLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async append(entry: Omit<IWorkflowExecutionLog, 'id'>): Promise<IWorkflowExecutionLog> {
    return (this.prisma as unknown as { workflowExecutionLog: { create(args: unknown): Promise<IWorkflowExecutionLog> } })
      .workflowExecutionLog.create({ data: entry });
  }

  async findByInstance(instanceId: string): Promise<IWorkflowExecutionLog[]> {
    return (this.prisma as unknown as { workflowExecutionLog: { findMany(args: unknown): Promise<IWorkflowExecutionLog[]> } })
      .workflowExecutionLog.findMany({ where: { instanceId }, orderBy: { occurredAt: 'asc' } });
  }

  async findByTenantAndEventType(
    tenantId: string,
    eventType: IWorkflowExecutionLog['eventType'],
    limit = 100,
  ): Promise<IWorkflowExecutionLog[]> {
    return (this.prisma as unknown as { workflowExecutionLog: { findMany(args: unknown): Promise<IWorkflowExecutionLog[]> } })
      .workflowExecutionLog.findMany({
        where: { tenantId, eventType },
        orderBy: { occurredAt: 'desc' },
        take: limit,
      });
  }
}
