/**
 * workflow-instance.repository.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 * See workflow-definition.repository.ts for the compilation note re:
 * generated Prisma Client types.
 */

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../base/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaModelDelegate } from '../../base/prisma-model-delegate.interface';
import { IWorkflowInstance, WorkflowInstanceStatus } from '../../interfaces/workflow-instance.interface';
import { BaseModel } from '../../../database/interfaces/base-model.interface';

type WorkflowInstanceRecord = IWorkflowInstance & BaseModel;

@Injectable()
export class WorkflowInstanceRepository extends BaseRepository<WorkflowInstanceRecord> {
  protected readonly modelName = 'WorkflowInstance';
  protected readonly allowedFilterFields = ['status', 'definitionKey', 'triggerType'];

  constructor(prisma: PrismaService) {
    super((prisma as unknown as { workflowInstance: PrismaModelDelegate<WorkflowInstanceRecord> }).workflowInstance);
  }

  async findActiveByTenant(tenantId: string): Promise<WorkflowInstanceRecord[]> {
    return this.getDelegate().findMany({
      where: { tenantId, status: WorkflowInstanceStatus.RUNNING, deletedAt: null },
    });
  }

  async findByParent(parentInstanceId: string): Promise<WorkflowInstanceRecord[]> {
    return this.getDelegate().findMany({ where: { parentInstanceId, deletedAt: null } });
  }
}
