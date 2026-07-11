/**
 * workflow-versioning.service.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * A new business version of a workflow definition is a new row (see the
 * `@@unique([tenantId, key, definitionVersion])` constraint), never an
 * in-place edit — running instances stay bound to the definitionVersion
 * they started on (IWorkflowInstance.definitionVersion), so editing a
 * definition never changes behavior for in-flight instances.
 */

import { Injectable } from '@nestjs/common';
import { IWorkflowDefinition } from '../interfaces/workflow-definition.interface';
import { WorkflowDefinitionRepository } from './repositories/workflow-definition.repository';
import { StateTransitionValidator } from '../state-machine/state-transition.validator';
import { BaseModel } from '../../database/interfaces/base-model.interface';

@Injectable()
export class WorkflowVersioningService {
  constructor(
    private readonly definitionRepository: WorkflowDefinitionRepository,
    private readonly stateTransitionValidator: StateTransitionValidator,
  ) {}

  /**
   * Publishes a new version of `key`: validates the graph, deactivates the
   * previously-active version (if any — old version stays queryable for
   * instances still running on it, just no longer picked up by
   * findActiveByKey for new starts), and inserts the new version active.
   */
  async publishNewVersion(
    tenantId: string,
    key: string,
    draft: Omit<IWorkflowDefinition, 'id' | 'tenantId' | 'key' | 'definitionVersion' | 'isActive'>,
    actorId?: string,
  ): Promise<IWorkflowDefinition> {
    const candidate: IWorkflowDefinition = { ...draft, id: '', tenantId, key, definitionVersion: 0, isActive: true };
    const problems = this.stateTransitionValidator.validateDefinition(candidate);
    if (problems.length > 0) {
      throw new Error(`Cannot publish workflow "${key}": ${problems.join('; ')}`);
    }

    const previousActive = await this.definitionRepository.findActiveByKey(tenantId, key);
    const nextVersionNumber = (previousActive?.definitionVersion ?? 0) + 1;

    if (previousActive) {
      await this.definitionRepository.update(previousActive.id, { isActive: false } as Partial<BaseModel>, tenantId, actorId);
    }

    return this.definitionRepository.create(
      { ...draft, key, definitionVersion: nextVersionNumber, isActive: true },
      tenantId,
      actorId,
    );
  }

  async getVersion(tenantId: string, key: string, version: number): Promise<IWorkflowDefinition | null> {
    return this.definitionRepository.findByKeyAndVersion(tenantId, key, version);
  }

  async getActiveVersion(tenantId: string, key: string): Promise<IWorkflowDefinition | null> {
    return this.definitionRepository.findActiveByKey(tenantId, key);
  }

  /** Deactivates a version without publishing a replacement (emergency stop for new starts; running instances are unaffected). */
  async deactivate(tenantId: string, key: string, version: number, actorId?: string): Promise<void> {
    const definition = await this.definitionRepository.findByKeyAndVersion(tenantId, key, version);
    if (!definition) throw new Error(`Workflow "${key}" v${version} not found`);
    await this.definitionRepository.update(definition.id, { isActive: false } as Partial<BaseModel>, tenantId, actorId);
  }
}
