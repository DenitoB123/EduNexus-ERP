/**
 * approval.interface.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 */

export enum ApprovalPolicyType {
  SINGLE = 'SINGLE',
  MULTI_LEVEL = 'MULTI_LEVEL',
  PARALLEL_ALL = 'PARALLEL_ALL',
  PARALLEL_ANY = 'PARALLEL_ANY',
  CONDITIONAL = 'CONDITIONAL',
}

export enum ApprovalDecisionValue {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ApprovalRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
  CANCELLED = 'CANCELLED',
}

/** One level of a MULTI_LEVEL approval, or the single level of a SINGLE approval. */
export interface IApprovalLevel {
  level: number;
  /** Explicit approver user IDs, and/or a role name resolved to approvers at runtime by the consuming module. */
  approverIds?: string[];
  approverRole?: string;
  /** For PARALLEL_ANY within a level: how many distinct approvals satisfy this level. Default 1 (first decides). */
  requiredApprovals?: number;
  escalation?: { afterMs: number; escalateToRole?: string; escalateToUserId?: string };
  /** Skip this level if the condition evaluates false (conditional approval). */
  condition?: { expression: string };
}

export interface IApprovalPolicy {
  type: ApprovalPolicyType;
  levels: IApprovalLevel[];
  /** If true, a REJECTED decision at any level stops the whole request; otherwise only that level fails. */
  rejectStopsAll?: boolean;
}

export interface IApprovalDecision {
  id: string;
  approvalRequestId: string;
  level: number;
  approverId: string;
  decision: ApprovalDecisionValue;
  comment?: string;
  decidedAt: Date;
}

export interface IApprovalRequest {
  id: string;
  tenantId: string;
  instanceId: string;
  stepId: string;
  policy: IApprovalPolicy;
  /** Snapshot of the workflow instance's context at request time, used to evaluate conditional approval levels. */
  context: Record<string, unknown>;
  status: ApprovalRequestStatus;
  currentLevel: number;
  decisions: IApprovalDecision[];
  requestedBy?: string;
  requestedAt: Date;
  resolvedAt?: Date;
}

/** Facade the workflow engine and business modules use to drive approvals — see approvals/approval.service.ts. */
export interface IApprovalService {
  requestApproval(
    tenantId: string,
    instanceId: string,
    stepId: string,
    policy: IApprovalPolicy,
    context: Record<string, unknown>,
    requestedBy?: string,
  ): Promise<IApprovalRequest>;

  decide(
    tenantId: string,
    approvalRequestId: string,
    approverId: string,
    decision: ApprovalDecisionValue,
    comment?: string,
  ): Promise<IApprovalRequest>;

  delegate(tenantId: string, approvalRequestId: string, level: number, fromUserId: string, toUserId: string): Promise<void>;

  escalate(tenantId: string, approvalRequestId: string, level: number): Promise<void>;

  getRequest(tenantId: string, approvalRequestId: string): Promise<IApprovalRequest | null>;
}
