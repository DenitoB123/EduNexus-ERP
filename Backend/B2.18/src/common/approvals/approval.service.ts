/**
 * approval.service.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Drives single/multi-level/parallel/conditional approvals. Does not know
 * anything about workflow steps directly — WorkflowExecutorService calls
 * requestApproval() when it hits an APPROVAL step, and this service calls
 * back into the engine (via a forwardRef, since Engine -> Executor ->
 * Approval -> Engine is a genuine dependency cycle) once a request
 * resolves, so the instance can advance.
 *
 * Every method takes `tenantId` explicitly and passes it through to
 * BaseRepository, which requires it for every query — never resolve an
 * approval record without it, or tenant scoping silently drops out of the
 * underlying Prisma `where` clause.
 */

import { Injectable, Inject, forwardRef } from '@nestjs/common';
import {
  ApprovalDecisionValue,
  ApprovalPolicyType,
  ApprovalRequestStatus,
  IApprovalPolicy,
  IApprovalRequest,
  IApprovalService,
} from '../interfaces/approval.interface';
import { ApprovalRequestRepository } from './repositories/approval-request.repository';
import { ApprovalDecisionRepository } from './repositories/approval-decision.repository';
import { ExpressionEngine } from '../business-rules/expression-engine';
import { AppLoggerService } from '../logger/app-logger.service';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';

type ApprovalRequestRecord = Omit<IApprovalRequest, 'decisions'>;

@Injectable()
export class ApprovalService implements IApprovalService {
  constructor(
    private readonly requestRepository: ApprovalRequestRepository,
    private readonly decisionRepository: ApprovalDecisionRepository,
    private readonly expressionEngine: ExpressionEngine,
    private readonly logger: AppLoggerService,
    @Inject(forwardRef(() => WorkflowEngineService))
    private readonly workflowEngine: WorkflowEngineService,
  ) {
    this.logger.setContext('ApprovalService');
  }

  async requestApproval(
    tenantId: string,
    instanceId: string,
    stepId: string,
    policy: IApprovalPolicy,
    context: Record<string, unknown>,
    requestedBy?: string,
  ): Promise<IApprovalRequest> {
    const startLevel = this.firstApplicableLevel(policy, 1, context) ?? policy.levels[0]?.level ?? 1;
    const created = await this.requestRepository.create(
      {
        instanceId,
        stepId,
        policy,
        context,
        status: ApprovalRequestStatus.PENDING,
        currentLevel: startLevel,
        requestedBy,
        requestedAt: new Date(),
      },
      tenantId,
    );
    return { ...(created as ApprovalRequestRecord), decisions: [] };
  }

  async decide(
    tenantId: string,
    approvalRequestId: string,
    approverId: string,
    decision: ApprovalDecisionValue,
    comment?: string,
  ): Promise<IApprovalRequest> {
    const request = await this.getRequestOrThrow(tenantId, approvalRequestId);
    if (request.status !== ApprovalRequestStatus.PENDING) {
      throw new Error(`Approval request ${approvalRequestId} is not pending (status: ${request.status})`);
    }

    await this.decisionRepository.create(tenantId, {
      approvalRequestId,
      level: request.currentLevel,
      approverId,
      decision,
      comment,
    });

    if (decision === ApprovalDecisionValue.REJECTED && (request.policy.rejectStopsAll ?? true)) {
      const updated = await this.requestRepository.update(
        approvalRequestId,
        { status: ApprovalRequestStatus.REJECTED, resolvedAt: new Date() },
        tenantId,
      );
      await this.notifyEngine(updated as ApprovalRequestRecord, ApprovalRequestStatus.REJECTED);
      return this.hydrate(updated as ApprovalRequestRecord);
    }

    const decisions = await this.decisionRepository.findByApprovalRequest(approvalRequestId);
    const levelDecisions = decisions.filter((d) => d.level === request.currentLevel);
    const currentLevelDef = request.policy.levels.find((l) => l.level === request.currentLevel);
    const requiredApprovals = currentLevelDef?.requiredApprovals ?? 1;

    const levelSatisfied =
      request.policy.type === ApprovalPolicyType.PARALLEL_ANY
        ? levelDecisions.filter((d) => d.decision === ApprovalDecisionValue.APPROVED).length >= requiredApprovals
        : request.policy.type === ApprovalPolicyType.PARALLEL_ALL
          ? levelDecisions.length >= (currentLevelDef?.approverIds?.length ?? 1) &&
            levelDecisions.every((d) => d.decision === ApprovalDecisionValue.APPROVED)
          : true; // SINGLE / MULTI_LEVEL / CONDITIONAL: one decision per level resolves it

    if (!levelSatisfied) {
      // More decisions needed at this level before advancing — stay PENDING.
      return this.hydrate(request);
    }

    const nextLevel = this.firstApplicableLevel(request.policy, request.currentLevel + 1, request.context);
    if (nextLevel === null) {
      const updated = await this.requestRepository.update(
        approvalRequestId,
        { status: ApprovalRequestStatus.APPROVED, resolvedAt: new Date() },
        tenantId,
      );
      await this.notifyEngine(updated as ApprovalRequestRecord, ApprovalRequestStatus.APPROVED);
      return this.hydrate(updated as ApprovalRequestRecord);
    }

    const updated = await this.requestRepository.update(approvalRequestId, { currentLevel: nextLevel }, tenantId);
    return this.hydrate(updated as ApprovalRequestRecord);
  }

  async delegate(tenantId: string, approvalRequestId: string, level: number, fromUserId: string, toUserId: string): Promise<void> {
    const request = await this.getRequestOrThrow(tenantId, approvalRequestId);
    const levelDef = request.policy.levels.find((l) => l.level === level);
    if (!levelDef) throw new Error(`Approval request ${approvalRequestId} has no level ${level}`);
    if (levelDef.approverIds) {
      levelDef.approverIds = levelDef.approverIds.map((id) => (id === fromUserId ? toUserId : id));
    }
    await this.requestRepository.update(approvalRequestId, { policy: request.policy }, tenantId);
    this.logger.log(`Delegated approval ${approvalRequestId} level ${level} from ${fromUserId} to ${toUserId}`);
  }

  async escalate(tenantId: string, approvalRequestId: string, level: number): Promise<void> {
    const request = await this.getRequestOrThrow(tenantId, approvalRequestId);
    const levelDef = request.policy.levels.find((l) => l.level === level);
    if (!levelDef?.escalation) return;

    if (levelDef.escalation.escalateToUserId) {
      levelDef.approverIds = [levelDef.escalation.escalateToUserId];
    } else if (levelDef.escalation.escalateToRole) {
      levelDef.approverRole = levelDef.escalation.escalateToRole;
    }
    await this.requestRepository.update(
      approvalRequestId,
      { status: ApprovalRequestStatus.ESCALATED, policy: request.policy },
      tenantId,
    );
    this.logger.warn(`Escalated approval ${approvalRequestId} level ${level}`);
  }

  async getRequest(tenantId: string, approvalRequestId: string): Promise<IApprovalRequest | null> {
    const request = await this.requestRepository.findById(approvalRequestId, tenantId);
    if (!request) return null;
    return this.hydrate(request as ApprovalRequestRecord);
  }

  private async getRequestOrThrow(tenantId: string, approvalRequestId: string): Promise<ApprovalRequestRecord> {
    const request = await this.requestRepository.findById(approvalRequestId, tenantId);
    if (!request) throw new Error(`Approval request ${approvalRequestId} not found for this tenant`);
    return request as ApprovalRequestRecord;
  }

  private async hydrate(request: ApprovalRequestRecord): Promise<IApprovalRequest> {
    const decisions = await this.decisionRepository.findByApprovalRequest(request.id);
    return { ...request, decisions };
  }

  /** Finds the first level >= startLevel whose condition (if any) passes, or null if none remain (approval complete). */
  private firstApplicableLevel(policy: IApprovalPolicy, startLevel: number, context: Record<string, unknown>): number | null {
    const candidates = policy.levels.filter((l) => l.level >= startLevel).sort((a, b) => a.level - b.level);
    for (const level of candidates) {
      if (!level.condition || this.expressionEngine.evaluateSafe(level.condition.expression, context)) {
        return level.level;
      }
    }
    return null;
  }

  private async notifyEngine(
    request: ApprovalRequestRecord,
    resolution: ApprovalRequestStatus.APPROVED | ApprovalRequestStatus.REJECTED,
  ): Promise<void> {
    await this.workflowEngine.advance(request.instanceId, request.stepId, {
      approvalResolution: resolution,
      approvalRequestId: request.id,
    });
  }
}
