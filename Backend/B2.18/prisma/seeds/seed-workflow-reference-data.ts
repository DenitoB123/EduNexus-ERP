/**
 * seed-workflow-reference-data.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Optional, idempotent seed: publishes one reference workflow definition
 * ("generic-single-approval") per tenant so the engine can be smoke-tested
 * immediately after the Prisma schema additions are merged and migrated —
 * this is reference/demo data, not a lookup table (the enums in
 * schema.workflow.additions.prisma are the actual "lookup values" and need
 * no seeding, Prisma enums are schema-level).
 *
 * Idempotency: upserts on the (tenantId, key, definitionVersion) unique
 * constraint, so re-running this seed is always safe.
 *
 * Not wired into a global seed runner automatically (this milestone is
 * standalone per the Parallel Milestone Architecture) — run manually with
 * `ts-node prisma/seeds/seed-workflow-reference-data.ts` once merged, or
 * call `seedWorkflowReferenceData(prisma, tenantId)` from your own seed
 * entrypoint.
 */

import { PrismaClient } from '@prisma/client';
import { WorkflowExecutionMode } from '../../src/common/interfaces/workflow-definition.interface';
import { ApprovalPolicyType } from '../../src/common/interfaces/approval.interface';

export async function seedWorkflowReferenceData(prisma: PrismaClient, tenantId: string): Promise<void> {
  const key = 'generic-single-approval';
  const definitionVersion = 1;

  const steps = [
    { id: 'start', name: 'Start', type: 'START' },
    {
      id: 'approval',
      name: 'Single Approval',
      type: 'APPROVAL',
      config: {
        approvalPolicy: {
          type: ApprovalPolicyType.SINGLE,
          levels: [{ level: 1, approverRole: 'APPROVER' }],
        },
      },
    },
    { id: 'end', name: 'End', type: 'END' },
  ];

  const transitions = [
    { id: 't1', fromStepId: 'start', toStepId: 'approval' },
    { id: 't2', fromStepId: 'approval', toStepId: 'end' },
  ];

  await (prisma as unknown as {
    workflowDefinition: {
      upsert(args: unknown): Promise<unknown>;
    };
  }).workflowDefinition.upsert({
    where: { tenantId_key_definitionVersion: { tenantId, key, definitionVersion } },
    update: {},
    create: {
      tenantId,
      key,
      name: 'Generic Single Approval',
      description: 'Reference workflow: one approval step, used for smoke-testing the engine after B2.21 consolidation.',
      definitionVersion,
      isActive: true,
      executionMode: WorkflowExecutionMode.SEQUENTIAL,
      startStepId: 'start',
      steps,
      transitions,
    },
  });
}
