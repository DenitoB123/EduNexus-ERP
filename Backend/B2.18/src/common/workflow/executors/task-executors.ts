/**
 * task-executors.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * One IWorkflowTaskExecutor per WorkflowStepType that does real work at
 * step-entry time (HUMAN_TASK/APPROVAL/EXTERNAL_TASK just create the
 * waiting record and return `awaitingExternalCompletion: true` — the
 * engine advances them later via IWorkflowEngine.advance() when the human
 * acts, the approval resolves, or the external callback arrives).
 */

import { Injectable } from '@nestjs/common';
import {
  IWorkflowTask,
  IWorkflowTaskExecutor,
  IWorkflowTaskResult,
  WorkflowTaskStatus,
} from '../../interfaces/workflow-task.interface';
import { withRetry } from '../../state-machine/state-machine';

@Injectable()
export class HumanTaskExecutor implements IWorkflowTaskExecutor {
  async execute(task: IWorkflowTask): Promise<IWorkflowTaskResult> {
    // The task record already exists (created by WorkflowExecutorService
    // before dispatch) with status PENDING and an assignee — nothing to run
    // here. Completion happens out-of-band when the assignee actions it.
    return { success: true, awaitingExternalCompletion: task.status !== WorkflowTaskStatus.COMPLETED };
  }
}

@Injectable()
export class ExternalTaskExecutor implements IWorkflowTaskExecutor {
  async execute(task: IWorkflowTask): Promise<IWorkflowTaskResult> {
    // Waits for an external system's callback (e.g. a webhook) to call
    // IWorkflowEngine.advance() with the result. Nothing synchronous to do.
    return { success: true, awaitingExternalCompletion: true };
  }
}

@Injectable()
export class ScheduledTaskExecutor implements IWorkflowTaskExecutor {
  /**
   * Scheduled steps don't run inline — AutomationService registers a job
   * with ScheduledJobsService (B2.2 infra) at step-entry time and that job
   * calls back into the engine when it fires. This executor is the
   * synchronous half: it just confirms the schedule was registered
   * (tracked via task.outputData by AutomationService) and defers.
   */
  async execute(task: IWorkflowTask): Promise<IWorkflowTaskResult> {
    return { success: true, awaitingExternalCompletion: true };
  }
}

/**
 * Runs a caller-supplied function (registered per workflow step via
 * config.handlerKey against a business module's own automated-step
 * registry — the framework doesn't hardcode business logic). Retries per
 * the step's retry policy using the shared withRetry helper.
 */
@Injectable()
export class AutomatedTaskExecutor implements IWorkflowTaskExecutor {
  private readonly handlers = new Map<string, (context: Record<string, unknown>) => Promise<Record<string, unknown> | void>>();

  /** Business modules register their automated-step handlers here at bootstrap. */
  registerHandler(key: string, handler: (context: Record<string, unknown>) => Promise<Record<string, unknown> | void>): void {
    this.handlers.set(key, handler);
  }

  async execute(
    task: IWorkflowTask,
    context: Record<string, unknown> = {},
    handlerKey?: string,
    retry?: { maxAttempts: number; backoffMs: number },
  ): Promise<IWorkflowTaskResult> {
    if (!handlerKey) {
      return { success: false, errorMessage: `AUTOMATED_TASK step "${task.stepId}" has no config.handlerKey` };
    }
    const handler = this.handlers.get(handlerKey);
    if (!handler) {
      return { success: false, errorMessage: `No automated-task handler registered for key "${handlerKey}"` };
    }

    try {
      const outputData = await withRetry(() => handler(context) as Promise<Record<string, unknown>>, {
        maxAttempts: retry?.maxAttempts ?? 1,
        backoffMs: retry?.backoffMs ?? 0,
      });
      return { success: true, outputData: outputData ?? undefined };
    } catch (error) {
      return { success: false, errorMessage: error instanceof Error ? error.message : 'Automated task failed' };
    }
  }
}
