/**
 * approval-decision.repository.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Approval decisions are immutable, append-only audit records (no
 * `version`/soft-delete fields — see the ApprovalDecision model in
 * schema.workflow.additions.prisma), so this does NOT extend
 * BaseRepository, which assumes optimistic-locking/soft-delete fields
 * every write path relies on. A plain insert-and-read repository is the
 * correct shape here, not a workaround.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IApprovalDecision } from '../../interfaces/approval.interface';

@Injectable()
export class ApprovalDecisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, decision: Omit<IApprovalDecision, 'id' | 'decidedAt'>): Promise<IApprovalDecision> {
    return (this.prisma as unknown as { approvalDecision: { create(args: unknown): Promise<IApprovalDecision> } })
      .approvalDecision.create({ data: { ...decision, tenantId } });
  }

  async findByApprovalRequest(approvalRequestId: string): Promise<IApprovalDecision[]> {
    return (this.prisma as unknown as { approvalDecision: { findMany(args: unknown): Promise<IApprovalDecision[]> } })
      .approvalDecision.findMany({ where: { approvalRequestId }, orderBy: { decidedAt: 'asc' } });
  }
}
