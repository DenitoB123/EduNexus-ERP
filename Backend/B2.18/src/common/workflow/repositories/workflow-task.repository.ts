/**
 * workflow-task.repository.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 * See workflow-definition.repository.ts for the compilation note re:
 * generated Prisma Client types.
 */

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../base/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaModelDelegate } from '../../base/prisma-model-delegate.interface';
import { IWorkflowTask, WorkflowTaskStatus } from '../../interfaces/workflow-task.interface';
import { BaseModel } from '../../../database/interfaces/base-model.interface';

type WorkflowTaskRecord = IWorkflowTask & BaseModel;

@Injectable()
export class WorkflowTaskRepository extends BaseRepository<WorkflowTaskRecord> {
  protected readonly modelName = 'WorkflowTask';
  protected readonly allowedFilterFields = ['status', 'assigneeId', 'instanceId'];

  constructor(prisma: PrismaService) {
    super((prisma as unknown as { workflowTask: PrismaModelDelegate<WorkflowTaskRecord> }).workflowTask);
  }

  async findPendingForAssignee(tenantId: string, assigneeId: string): Promise<WorkflowTaskRecord[]> {
    return this.getDelegate().findMany({
      where: { tenantId, assigneeId, status: WorkflowTaskStatus.PENDING, deletedAt: null },
    });
  }

  async findByInstance(instanceId: string): Promise<WorkflowTaskRecord[]> {
    return this.getDelegate().findMany({ where: { instanceId, deletedAt: null } });
  }
}
