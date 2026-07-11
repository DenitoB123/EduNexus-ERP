/**
 * workflow-engine.service.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * The orchestrator. Owns the instance lifecycle: start -> execute current
 * step(s) via WorkflowExecutorService -> evaluate outgoing transitions via
 * ExpressionEngine -> advance to next step(s) -> repeat until an END step
 * or a terminal status. Supports SEQUENTIAL and PARALLEL execution modes,
 * conditional/dynamic routing (transition conditions), nested processes
 * (SUB_PROCESS steps delegate to a child instance via chainWorkflow-style
 * start()), retry, and compensation-on-failure.
 */

import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { IWorkflowEngine, IStartWorkflowOptions } from '../interfaces/workflow-engine.interface';
import {
  IWorkflowInstance,
  WorkflowInstanceStatus,
} from '../interfaces/workflow-instance.interface';
import { WorkflowExecutionLogEventType } from '../interfaces/workflow-instance.interface';
import {
  IWorkflowDefinition,
  IWorkflowStepDefinition,
  WorkflowExecutionMode,
  WorkflowStepType,
} from '../interfaces/workflow-definition.interface';
import { WorkflowDefinitionRepository } from './repositories/workflow-definition.repository';
import { WorkflowInstanceRepository } from './repositories/workflow-instance.repository';
import { WorkflowExecutionLogRepository } from './repositories/workflow-execution-log.repository';
import { WorkflowExecutorService } from './executors/workflow-executor.service';
import { StateTransitionValidator } from '../state-machine/state-transition.validator';
import { withRetry } from '../state-machine/state-machine';
import { ExpressionEngine } from '../business-rules/expression-engine';
import { AutomationService } from '../automation/automation.service';
import { AppLoggerService } from '../logger/app-logger.service';

@Injectable()
export class WorkflowEngineService implements IWorkflowEngine {
  constructor(
    private readonly definitionRepository: WorkflowDefinitionRepository,
    private readonly instanceRepository: WorkflowInstanceRepository,
    private readonly executionLogRepository: WorkflowExecutionLogRepository,
    private readonly stateTransitionValidator: StateTransitionValidator,
    private readonly expressionEngine: ExpressionEngine,
    @Inject(forwardRef(() => WorkflowExecutorService))
    private readonly executor: WorkflowExecutorService,
    @Inject(forwardRef(() => AutomationService))
    private readonly automationService: AutomationService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('WorkflowEngineService');
  }

  async start(options: IStartWorkflowOptions): Promise<IWorkflowInstance> {
    const definition = options.definitionVersion
      ? await this.definitionRepository.findByKeyAndVersion(options.tenantId, options.definitionKey, options.definitionVersion)
      : await this.definitionRepository.findActiveByKey(options.tenantId, options.definitionKey);

    if (!definition) {
      throw new Error(`No active workflow definition found for key "${options.definitionKey}" (tenant ${options.tenantId})`);
    }

    const problems = this.stateTransitionValidator.validateDefinition(definition);
    if (problems.length > 0) {
      throw new Error(`Workflow definition "${options.definitionKey}" v${definition.definitionVersion} is invalid: ${problems.join('; ')}`);
    }

    const instance = await this.instanceRepository.create(
      {
        definitionId: definition.id,
        definitionKey: definition.key,
        definitionVersion: definition.definitionVersion,
        status: WorkflowInstanceStatus.RUNNING,
        currentStepIds: [definition.startStepId],
        context: options.initialContext ?? {},
        triggerType: options.triggerType,
        triggeredBy: options.triggeredBy,
        parentInstanceId: options.parentInstanceId,
        startedAt: new Date(),
      },
      options.tenantId,
    );

    await this.log(options.tenantId, instance.id, WorkflowExecutionLogEventType.INSTANCE_STARTED, undefined, options.triggeredBy);

    return this.driveFrom(definition, instance as unknown as IWorkflowInstance);
  }

  async advance(instanceId: string, stepId: string, outputData?: Record<string, unknown>): Promise<IWorkflowInstance> {
    const instance = await this.getInstanceOrThrow(instanceId);
    const definition = await this.getDefinitionOrThrow(instance);

    if (instance.status !== WorkflowInstanceStatus.RUNNING) {
      throw new Error(`Cannot advance instance ${instanceId}: status is ${instance.status}, not RUNNING`);
    }

    const mergedContext = { ...instance.context, ...outputData };
    const updated = await this.instanceRepository.update(instanceId, { context: mergedContext }, instance.tenantId);

    await this.log(instance.tenantId, instanceId, WorkflowExecutionLogEventType.STEP_COMPLETED, stepId);

    return this.driveFrom(definition, updated as unknown as IWorkflowInstance, stepId);
  }

  async cancel(instanceId: string, reason?: string): Promise<IWorkflowInstance> {
    const instance = await this.getInstanceOrThrow(instanceId);
    const updated = await this.instanceRepository.update(
      instanceId,
      { status: WorkflowInstanceStatus.CANCELLED, errorMessage: reason },
      instance.tenantId,
    );
    await this.log(instance.tenantId, instanceId, WorkflowExecutionLogEventType.INSTANCE_CANCELLED, undefined, undefined, reason);
    return updated as unknown as IWorkflowInstance;
  }

  async suspend(instanceId: string): Promise<IWorkflowInstance> {
    const instance = await this.getInstanceOrThrow(instanceId);
    return this.instanceRepository.update(instanceId, { status: WorkflowInstanceStatus.SUSPENDED }, instance.tenantId) as unknown as Promise<IWorkflowInstance>;
  }

  async resume(instanceId: string): Promise<IWorkflowInstance> {
    const instance = await this.getInstanceOrThrow(instanceId);
    if (instance.status !== WorkflowInstanceStatus.SUSPENDED) {
      throw new Error(`Cannot resume instance ${instanceId}: status is ${instance.status}, not SUSPENDED`);
    }
    return this.instanceRepository.update(instanceId, { status: WorkflowInstanceStatus.RUNNING }, instance.tenantId) as unknown as Promise<IWorkflowInstance>;
  }

  async retry(instanceId: string, stepId: string): Promise<IWorkflowInstance> {
    const instance = await this.getInstanceOrThrow(instanceId);
    const definition = await this.getDefinitionOrThrow(instance);
    const step = definition.steps.find((s) => s.id === stepId);
    if (!step) throw new Error(`Step "${stepId}" not found in definition "${definition.key}"`);

    await this.log(instance.tenantId, instanceId, WorkflowExecutionLogEventType.STEP_RETRIED, stepId);

    const retryOptions = step.retry ?? { maxAttempts: 1, backoffMs: 0 };
    const outcome = await withRetry(
      () => this.executor.executeStep(instance, step),
      retryOptions,
    );

    if (!outcome.completed && outcome.errorMessage) {
      return this.fail(instance, step, outcome.errorMessage);
    }
    return this.advance(instanceId, stepId, outcome.outputData);
  }

  async getInstance(instanceId: string): Promise<IWorkflowInstance | null> {
    // NOTE: tenant-scoped lookup requires the caller's tenantId; this
    // top-level convenience method is intentionally not exposed without it
    // in the HTTP layer — controllers must resolve tenantId from
    // TenantContextService and call the repository directly, or a future
    // WorkflowController wraps this with the tenant guard applied. Left as
    // a document TODO rather than silently querying without tenant scope.
    throw new Error(
      'getInstance(instanceId) without a tenantId is not implemented to avoid bypassing tenant isolation. ' +
        'Use WorkflowInstanceRepository.findById(instanceId, tenantId) directly from a tenant-scoped caller.',
    );
  }

  // ---------------------------------------------------------------------
  // Internal orchestration
  // ---------------------------------------------------------------------

  /**
   * Drives the instance forward from either its current step(s) (on
   * start()) or the step that just completed (on advance()), following
   * outgoing transitions until every active branch reaches a step that is
   * awaiting external completion, or the instance reaches an END step.
   */
  private async driveFrom(
    definition: IWorkflowDefinition,
    instance: IWorkflowInstance,
    justCompletedStepId?: string,
  ): Promise<IWorkflowInstance> {
    let current = instance;
    const stepIdsToProcess = justCompletedStepId
      ? this.resolveNextSteps(definition, justCompletedStepId, current.context)
      : current.currentStepIds;

    const isParallel = definition.executionMode === WorkflowExecutionMode.PARALLEL;
    const activeStepIds: string[] = [];

    const processOne = async (stepId: string): Promise<void> => {
      const step = definition.steps.find((s) => s.id === stepId);
      if (!step) return;

      await this.log(current.tenantId, current.id, WorkflowExecutionLogEventType.STEP_ENTERED, step.id);

      if (step.type === WorkflowStepType.END) {
        return; // terminal — handled after the loop
      }

      const outcome = await this.executor.executeStep(current, step).catch((error) => ({
        completed: false,
        errorMessage: error instanceof Error ? error.message : 'Step execution threw',
      }));

      if (!outcome.completed) {
        if (outcome.errorMessage) {
          await this.fail(current, step, outcome.errorMessage);
          return;
        }
        // Awaiting external completion (human task, approval, external
        // callback, scheduled job) — stays as an active current step.
        activeStepIds.push(step.id);
        return;
      }

      const merged = outcome.outputData ? { ...current.context, ...outcome.outputData } : current.context;
      const nextStepIds = this.resolveNextSteps(definition, step.id, merged);
      current = { ...current, context: merged };

      if (nextStepIds.length === 0) {
        return; // dead end reached synchronously; treated as complete-branch
      }
      for (const nextId of nextStepIds) {
        await processOne(nextId);
      }
    };

    if (isParallel) {
      await Promise.all(stepIdsToProcess.map((id) => processOne(id)));
    } else {
      for (const id of stepIdsToProcess) {
        await processOne(id);
      }
    }

    const reachedEnd = activeStepIds.length === 0 && this.allBranchesAtEnd(definition, current, stepIdsToProcess);

    if (reachedEnd) {
      return this.complete(current);
    }

    return this.instanceRepository.update(
      current.id,
      { currentStepIds: activeStepIds.length > 0 ? activeStepIds : current.currentStepIds, context: current.context },
      current.tenantId,
    ) as unknown as Promise<IWorkflowInstance>;
  }

  private allBranchesAtEnd(definition: IWorkflowDefinition, instance: IWorkflowInstance, processedStepIds: string[]): boolean {
    // Simplification for this milestone: an instance completes once every
    // step processed in this pass resolved with zero further transitions
    // (i.e. it ran off the end of the graph, an END step, or a step with
    // no outgoing transition — already caught as a validation error unless
    // it's a genuine END). PARALLEL_ANY-style "first branch wins, cancel
    // the rest" join semantics are a documented future extension (see
    // IMPLEMENTATION_SUMMARY) rather than implemented here.
    return processedStepIds.every((stepId) => {
      const step = definition.steps.find((s) => s.id === stepId);
      return step?.type === WorkflowStepType.END || this.resolveNextSteps(definition, stepId, instance.context).length === 0;
    });
  }

  private resolveNextSteps(definition: IWorkflowDefinition, fromStepId: string, context: Record<string, unknown>): string[] {
    const candidates = definition.transitions
      .filter((t) => t.fromStepId === fromStepId)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    const step = definition.steps.find((s) => s.id === fromStepId);
    const isGateway = step?.type === WorkflowStepType.PARALLEL_GATEWAY;

    const eligible = candidates.filter(
      (t) => !t.condition || this.expressionEngine.evaluateSafe(t.condition.expression, { context }),
    );

    if (isGateway) {
      return eligible.map((t) => t.toStepId); // parallel gateway: fan out to every eligible transition
    }
    // Conditional/dynamic routing: first eligible transition by priority wins.
    return eligible.length > 0 ? [eligible[0].toStepId] : [];
  }

  private async complete(instance: IWorkflowInstance): Promise<IWorkflowInstance> {
    const updated = await this.instanceRepository.update(
      instance.id,
      { status: WorkflowInstanceStatus.COMPLETED, completedAt: new Date(), currentStepIds: [] },
      instance.tenantId,
    );
    await this.log(instance.tenantId, instance.id, WorkflowExecutionLogEventType.INSTANCE_COMPLETED);
    return updated as unknown as IWorkflowInstance;
  }

  private async fail(instance: IWorkflowInstance, step: IWorkflowStepDefinition, errorMessage: string): Promise<IWorkflowInstance> {
    await this.log(instance.tenantId, instance.id, WorkflowExecutionLogEventType.STEP_FAILED, step.id, undefined, errorMessage);

    const updated = await this.instanceRepository.update(
      instance.id,
      { status: WorkflowInstanceStatus.FAILED, failedAt: new Date(), errorMessage },
      instance.tenantId,
    );
    await this.log(instance.tenantId, instance.id, WorkflowExecutionLogEventType.INSTANCE_FAILED, step.id, undefined, errorMessage);

    if (step.compensationStepId) {
      await this.compensate(updated as unknown as IWorkflowInstance, step);
    }

    return updated as unknown as IWorkflowInstance;
  }

  private async compensate(instance: IWorkflowInstance, failedStep: IWorkflowStepDefinition): Promise<void> {
    const handler = this.executor.getCompensationHandler(instance.definitionKey);
    if (!handler) {
      this.logger.warn(`Step "${failedStep.id}" has a compensationStepId but no compensation handler is registered for workflow "${instance.definitionKey}"`);
      return;
    }

    await this.instanceRepository.update(instance.id, { status: WorkflowInstanceStatus.COMPENSATING }, instance.tenantId);
    await this.log(instance.tenantId, instance.id, WorkflowExecutionLogEventType.COMPENSATION_STARTED, failedStep.id);

    try {
      await handler.compensate(instance, failedStep);
      await this.instanceRepository.update(instance.id, { status: WorkflowInstanceStatus.COMPENSATED }, instance.tenantId);
      await this.log(instance.tenantId, instance.id, WorkflowExecutionLogEventType.COMPENSATION_COMPLETED, failedStep.id);
    } catch (error) {
      this.logger.error(
        `Compensation failed for instance ${instance.id} step ${failedStep.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async getInstanceOrThrow(instanceId: string): Promise<IWorkflowInstance & { tenantId: string }> {
    // Instance IDs are UUIDs (globally unique), so a tenant-agnostic lookup
    // followed by using the record's own tenantId for every subsequent
    // write is safe here — unlike ApprovalService, the engine does not
    // receive tenantId from an external, un-trusted caller at this entry
    // point (advance/cancel/etc. are called by the framework's own
    // executors/automation, which already validated the instance's tenant
    // upstream when they loaded it).
    const found = await this.instanceRepository.getDelegate().findUnique({ where: { id: instanceId } });
    if (!found) throw new Error(`Workflow instance ${instanceId} not found`);
    return found as unknown as IWorkflowInstance & { tenantId: string };
  }

  private async getDefinitionOrThrow(instance: IWorkflowInstance): Promise<IWorkflowDefinition> {
    const definition = await this.definitionRepository.findByKeyAndVersion(
      instance.tenantId,
      instance.definitionKey,
      instance.definitionVersion,
    );
    if (!definition) throw new Error(`Definition "${instance.definitionKey}" v${instance.definitionVersion} not found`);
    return definition as unknown as IWorkflowDefinition;
  }

  private async log(
    tenantId: string,
    instanceId: string,
    eventType: WorkflowExecutionLogEventType,
    stepId?: string,
    actorId?: string,
    message?: string,
  ): Promise<void> {
    await this.executionLogRepository.append({
      tenantId,
      instanceId,
      stepId,
      eventType,
      actorId,
      message,
      occurredAt: new Date(),
    });
  }
}
