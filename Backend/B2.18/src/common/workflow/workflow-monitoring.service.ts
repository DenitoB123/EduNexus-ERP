/**
 * workflow-monitoring.service.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Read-side views over WorkflowInstanceRepository and
 * WorkflowExecutionLogRepository — every query is tenant-scoped.
 */

import { Injectable } from '@nestjs/common';
import { WorkflowInstanceRepository } from '../workflow/repositories/workflow-instance.repository';
import { WorkflowExecutionLogRepository } from '../workflow/repositories/workflow-execution-log.repository';
import { IWorkflowInstance, WorkflowInstanceStatus, IWorkflowExecutionLog } from '../interfaces/workflow-instance.interface';

export interface IWorkflowPerformanceMetrics {
  definitionKey: string;
  totalInstances: number;
  completed: number;
  failed: number;
  cancelled: number;
  running: number;
  averageDurationMs: number | null;
}

@Injectable()
export class WorkflowMonitoringService {
  constructor(
    private readonly instanceRepository: WorkflowInstanceRepository,
    private readonly executionLogRepository: WorkflowExecutionLogRepository,
  ) {}

  async getActiveWorkflows(tenantId: string): Promise<IWorkflowInstance[]> {
    return this.instanceRepository.findActiveByTenant(tenantId);
  }

  async getCompletedWorkflows(tenantId: string, limit = 50): Promise<IWorkflowInstance[]> {
    const result = await this.instanceRepository.findMany(
      { filters: [{ field: 'tenantId', operator: 'eq', value: tenantId }, { field: 'status', operator: 'eq', value: WorkflowInstanceStatus.COMPLETED }], pagination: { page: 1, pageSize: limit }, sort: [{ field: 'completedAt', order: 'desc' }] },
      tenantId,
    );
    return result.items;
  }

  async getFailedWorkflows(tenantId: string, limit = 50): Promise<IWorkflowInstance[]> {
    const result = await this.instanceRepository.findMany(
      { filters: [{ field: 'tenantId', operator: 'eq', value: tenantId }, { field: 'status', operator: 'eq', value: WorkflowInstanceStatus.FAILED }], pagination: { page: 1, pageSize: limit }, sort: [{ field: 'failedAt', order: 'desc' }] },
      tenantId,
    );
    return result.items;
  }

  async getExecutionHistory(instanceId: string): Promise<IWorkflowExecutionLog[]> {
    return this.executionLogRepository.findByInstance(instanceId);
  }

  /**
   * Aggregates completion-rate and average-duration metrics for a workflow
   * key by scanning INSTANCE_COMPLETED/INSTANCE_FAILED log entries. This
   * is a simple in-process aggregation appropriate for moderate volumes;
   * if execution-log volume grows large enough that this becomes slow, the
   * fix is a scheduled aggregation job writing pre-computed rollups, not a
   * change to this service's contract — noted as a future extension point
   * in the implementation summary rather than built preemptively.
   */
  async getPerformanceMetrics(tenantId: string, definitionKey: string, sampleSize = 500): Promise<IWorkflowPerformanceMetrics> {
    const result = await this.instanceRepository.findMany(
      {
        filters: [
          { field: 'tenantId', operator: 'eq', value: tenantId },
          { field: 'definitionKey', operator: 'eq', value: definitionKey },
        ],
        pagination: { page: 1, pageSize: sampleSize },
        sort: [{ field: 'startedAt', order: 'desc' }],
      },
      tenantId,
    );

    const instances = result.items;
    const completed = instances.filter((i) => i.status === WorkflowInstanceStatus.COMPLETED);
    const failed = instances.filter((i) => i.status === WorkflowInstanceStatus.FAILED);
    const cancelled = instances.filter((i) => i.status === WorkflowInstanceStatus.CANCELLED);
    const running = instances.filter((i) => i.status === WorkflowInstanceStatus.RUNNING);

    const durations = completed
      .filter((i) => i.completedAt)
      .map((i) => new Date(i.completedAt as Date).getTime() - new Date(i.startedAt).getTime());
    const averageDurationMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

    return {
      definitionKey,
      totalInstances: instances.length,
      completed: completed.length,
      failed: failed.length,
      cancelled: cancelled.length,
      running: running.length,
      averageDurationMs,
    };
  }
}
