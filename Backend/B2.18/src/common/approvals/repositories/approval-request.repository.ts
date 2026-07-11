/**
 * approval-request.repository.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 * See workflow-definition.repository.ts for the compilation note re:
 * generated Prisma Client types.
 */

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../base/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaModelDelegate } from '../../base/prisma-model-delegate.interface';
import { IApprovalRequest, ApprovalRequestStatus } from '../../interfaces/approval.interface';
import { BaseModel } from '../../../database/interfaces/base-model.interface';

type ApprovalRequestRecord = Omit<IApprovalRequest, 'decisions'> & BaseModel;

@Injectable()
export class ApprovalRequestRepository extends BaseRepository<ApprovalRequestRecord> {
  protected readonly modelName = 'ApprovalRequest';
  protected readonly allowedFilterFields = ['status', 'instanceId'];

  constructor(prisma: PrismaService) {
    super((prisma as unknown as { approvalRequest: PrismaModelDelegate<ApprovalRequestRecord> }).approvalRequest);
  }

  async findPendingByInstance(instanceId: string): Promise<ApprovalRequestRecord[]> {
    return this.getDelegate().findMany({
      where: { instanceId, status: ApprovalRequestStatus.PENDING, deletedAt: null },
    });
  }
}
