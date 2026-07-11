/**
 * workflow-executor.service.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Executes exactly one step: creates/loads the step's WorkflowTask record,
 * hands off to the right IWorkflowTaskExecutor for the step's type, and
 * reports back whether the step completed synchronously or is awaiting
 * external completion (human action, approval decision, external callback,
 * scheduled job firing).
 */

import { Injectable, Inject, forwardRef } from '@nestjs/common';
import {
  IWorkflowExecutor,
  ICompensationHandler,
} from '../../interfaces/workflow-engine.interface';
import { IWorkflowInstance } from '../../interfaces/workflow-instance.interface';
import { IWorkflowStepDefinition, WorkflowStepType } from '../../interfaces/workflow-definition.interface';
import { IApprovalPolicy } from '../../interfaces/approval.interface';
import { WorkflowTaskStatus } from '../../interfaces/workflow-task.interface';
import { WorkflowTaskRepository } from '../repositories/workflow-task.repository';
import { HumanTaskExecutor, ExternalTaskExecutor, ScheduledTaskExecutor, AutomatedTaskExecutor } from '../executors/task-executors';
import { ApprovalService } from '../../approvals/approval.service';
import { AutomationService } from '../../automation/automation.service';
import { AppLoggerService } from '../../logger/app-logger.service';

@Injectable()
export class WorkflowExecutorService implements IWorkflowExecutor {
  private readonly compensationHandlers = new Map<string, ICompensationHandler>();

  constructor(
    private readonly taskRepository: WorkflowTaskRepository,
    private readonly humanTaskExecutor: HumanTaskExecutor,
    private readonly externalTaskExecutor: ExternalTaskExecutor,
    private readonly scheduledTaskExecutor: ScheduledTaskExecutor,
    private readonly automatedTaskExecutor: AutomatedTaskExecutor,
    @Inject(forwardRef(() => ApprovalService))
    private readonly approvalService: ApprovalService,
    @Inject(forwardRef(() => AutomationService))
    private readonly automationService: AutomationService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('WorkflowExecutorService');
  }

  /** Business modules/other framework parts register a compensation handler per workflow key here. */
  registerCompensationHandler(workflowKey: string, handler: ICompensationHandler): void {
    this.compensationHandlers.set(workflowKey, handler);
  }

  getCompensationHandler(workflowKey: string): ICompensationHandler | undefined {
    return this.compensationHandlers.get(workflowKey);
  }

  async executeStep(
    instance: IWorkflowInstance,
    step: IWorkflowStepDefinition,
  ): Promise<{ completed: boolean; outputData?: Record<string, unknown>; errorMessage?: string }> {
    switch (step.type) {
      case WorkflowStepType.START:
      case WorkflowStepType.END:
      case WorkflowStepType.PARALLEL_GATEWAY:
      case WorkflowStepType.CONDITIONAL_GATEWAY:
        // Pure routing steps — no task record, no external work.
        return { completed: true };

      case WorkflowStepType.HUMAN_TASK: {
        const task = await this.taskRepository.create(
          {
            instanceId: instance.id,
            stepId: step.id,
            name: step.name,
            status: WorkflowTaskStatus.PENDING,
            assigneeId: step.config?.assigneeId as string | undefined,
            dueAt: step.escalation ? new Date(Date.now() + step.escalation.afterMs) : undefined,
            startedAt: new Date(),
            attempts: 0,
            maxAttempts: step.retry?.maxAttempts ?? 1,
          },
          instance.tenantId,
        );
        const result = await this.humanTaskExecutor.execute(task);
        if (step.escalation) {
          await this.automationService.scheduleEscalationCheck(instance.id, step.id, step.escalation.afterMs);
        }
        return { completed: !result.awaitingExternalCompletion, outputData: result.outputData };
      }

      case WorkflowStepType.APPROVAL: {
        const policy = step.config?.approvalPolicy as IApprovalPolicy;
        await this.approvalService.requestApproval(instance.tenantId, instance.id, step.id, policy, instance.context, instance.triggeredBy);
        return { completed: false };
      }

      case WorkflowStepType.EXTERNAL_TASK: {
        const task = await this.taskRepository.create(
          {
            instanceId: instance.id,
            stepId: step.id,
            name: step.name,
            status: WorkflowTaskStatus.PENDING,
            startedAt: new Date(),
            attempts: 0,
            maxAttempts: step.retry?.maxAttempts ?? 1,
          },
          instance.tenantId,
        );
        const result = await this.externalTaskExecutor.execute(task);
        return { completed: !result.awaitingExternalCompletion, outputData: result.outputData };
      }

      case WorkflowStepType.SCHEDULED_TASK: {
        const task = await this.taskRepository.create(
          {
            instanceId: instance.id,
            stepId: step.id,
            name: step.name,
            status: WorkflowTaskStatus.PENDING,
            startedAt: new Date(),
            attempts: 0,
            maxAttempts: 1,
          },
          instance.tenantId,
        );
        await this.automationService.scheduleWorkflowStep(instance.id, step.id, step.config?.runAtMs as number | undefined);
        const result = await this.scheduledTaskExecutor.execute(task);
        return { completed: !result.awaitingExternalCompletion };
      }

      case WorkflowStepType.AUTOMATED_TASK: {
        const task = await this.taskRepository.create(
          {
            instanceId: instance.id,
            stepId: step.id,
            name: step.name,
            status: WorkflowTaskStatus.IN_PROGRESS,
            startedAt: new Date(),
            attempts: 0,
            maxAttempts: step.retry?.maxAttempts ?? 1,
          },
          instance.tenantId,
        );
        const result = await this.automatedTaskExecutor.execute(
          task,
          instance.context,
          step.config?.handlerKey as string | undefined,
          step.retry,
        );
        await this.taskRepository.update(
          task.id,
          {
            status: result.success ? WorkflowTaskStatus.COMPLETED : WorkflowTaskStatus.FAILED,
            completedAt: new Date(),
            outputData: result.outputData,
            errorMessage: result.errorMessage,
          },
          instance.tenantId,
        );
        return { completed: result.success, outputData: result.outputData, errorMessage: result.errorMessage };
      }

      case WorkflowStepType.SUB_PROCESS:
        // Started by WorkflowEngineService (needs IWorkflowEngine.start(), which
        // would create a circular constructor dependency if injected here) —
        // this executor just signals "not completed yet"; the engine drives
        // the child instance and calls back via advance() on completion.
        return { completed: false };

      default:
        return { completed: false, errorMessage: `Unknown step type "${step.type}"` };
    }
  }
}
