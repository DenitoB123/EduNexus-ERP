/**
 * workflow-definition.repository.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * NOTE ON COMPILATION: this repository casts `this.prisma.workflowDefinition`
 * to `PrismaModelDelegate<IWorkflowDefinition>`. That property only exists
 * on the generated Prisma Client once prisma/schema.workflow.additions.prisma
 * is merged into prisma/schema.prisma and `npx prisma generate` is re-run
 * (expected at B2.21 consolidation, per the Parallel Milestone Architecture
 * — this file will not type-check standalone until then, same as every
 * other repository in a parallel milestone that adds new Prisma models).
 */

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../base/base.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaModelDelegate } from '../../base/prisma-model-delegate.interface';
import { IWorkflowDefinition } from '../../interfaces/workflow-definition.interface';
import { BaseModel } from '../../../database/interfaces/base-model.interface';

type WorkflowDefinitionRecord = IWorkflowDefinition & BaseModel;

@Injectable()
export class WorkflowDefinitionRepository extends BaseRepository<WorkflowDefinitionRecord> {
  protected readonly modelName = 'WorkflowDefinition';
  protected readonly allowedFilterFields = ['key', 'isActive', 'version'];

  constructor(prisma: PrismaService) {
    super((prisma as unknown as { workflowDefinition: PrismaModelDelegate<WorkflowDefinitionRecord> }).workflowDefinition);
  }

  async findActiveByKey(tenantId: string, key: string): Promise<WorkflowDefinitionRecord | null> {
    return this.getDelegate().findFirst({
      where: { tenantId, key, isActive: true, deletedAt: null },
    });
  }

  async findByKeyAndVersion(
    tenantId: string,
    key: string,
    version: number,
  ): Promise<WorkflowDefinitionRecord | null> {
    return this.getDelegate().findFirst({
      where: { tenantId, key, definitionVersion: version, deletedAt: null },
    });
  }
}
