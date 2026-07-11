/**
 * automation.service.ts
 *
 * B2.18 — Enterprise Workflow, Business Process & Orchestration Framework
 *
 * Integrates the workflow engine with B2.2's existing EventBus
 * (infrastructure/events) and job infrastructure (infrastructure/jobs) —
 * neither is recreated here. Automation is one direction of a two-way
 * relationship: this service both (a) lets a workflow definition register
 * to auto-start on a domain event or schedule, and (b) lets a running
 * instance schedule a deferred callback into the engine (scheduled steps,
 * escalation checks) via the same job queue.
 */

import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { EventBus } from '../../infrastructure/events/event-bus.service';
import { IEvent, IEventHandler } from '../../infrastructure/interfaces/event.interface';
import { JobRegistry } from '../../infrastructure/jobs/job-registry.service';
import { ScheduledJobsService } from '../../infrastructure/jobs/scheduled-jobs.service';
import { JobHandlerBase } from '../../infrastructure/jobs/job-handler.base';
import { JobPayload } from '../../infrastructure/interfaces/job.interface';
import { AppLoggerService } from '../logger/app-logger.service';
import { WorkflowTriggerType } from '../interfaces/workflow-instance.interface';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';

interface IEventTriggerRegistration {
  eventName: string;
  definitionKey: string;
  tenantId?: string;
  /** Maps the domain event's payload into the new instance's initial context. */
  contextMapper?: (event: IEvent) => Record<string, unknown>;
}

interface IScheduleTriggerRegistration {
  cronLikeIntervalMs: number;
  definitionKey: string;
  tenantId: string;
  initialContext?: Record<string, unknown>;
}

interface WorkflowStepJobData {
  instanceId: string;
  stepId: string;
  kind: 'STEP_DUE' | 'ESCALATION_CHECK';
}

@Injectable()
export class WorkflowStepJobHandler extends JobHandlerBase<WorkflowStepJobData> {
  readonly name = 'workflow.step-due';

  constructor(
    @Inject(forwardRef(() => WorkflowEngineService))
    private readonly workflowEngine: WorkflowEngineService,
    private readonly logger: AppLoggerService,
  ) {
    super();
    this.logger.setContext('WorkflowStepJobHandler');
  }

  async process(payload: JobPayload<WorkflowStepJobData>): Promise<void> {
    const { instanceId, stepId, kind } = payload.data;
    try {
      if (kind === 'STEP_DUE') {
        await this.workflowEngine.advance(instanceId, stepId, { scheduledStepFired: true });
      } else {
        await this.workflowEngine.retry(instanceId, stepId); // escalation check re-evaluates via retry path
      }
    } catch (error) {
      this.logger.error(
        `Workflow job "${kind}" failed for instance ${instanceId} step ${stepId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

@Injectable()
export class WorkflowScheduleTriggerJobHandler extends JobHandlerBase<IScheduleTriggerRegistration> {
  readonly name = 'workflow.scheduled-trigger';

  constructor(
    @Inject(forwardRef(() => WorkflowEngineService))
    private readonly workflowEngine: WorkflowEngineService,
    private readonly scheduledJobsService: ScheduledJobsService,
    private readonly logger: AppLoggerService,
  ) {
    super();
    this.logger.setContext('WorkflowScheduleTriggerJobHandler');
  }

  async process(payload: JobPayload<IScheduleTriggerRegistration>): Promise<void> {
    const registration = payload.data;
    try {
      await this.workflowEngine.start({
        tenantId: registration.tenantId,
        definitionKey: registration.definitionKey,
        triggerType: WorkflowTriggerType.SCHEDULE,
        initialContext: registration.initialContext,
      });
    } catch (error) {
      this.logger.error(
        `Scheduled workflow trigger failed for "${registration.definitionKey}"`,
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      // Re-arm for the next occurrence regardless of success/failure, so a
      // single failed run doesn't silently kill the recurring schedule.
      await this.scheduledJobsService.scheduleAt(
        this.name,
        registration,
        new Date(Date.now() + registration.cronLikeIntervalMs),
      );
    }
  }
}

@Injectable()
export class AutomationService {
  private readonly eventTriggers: IEventTriggerRegistration[] = [];

  constructor(
    private readonly eventBus: EventBus,
    private readonly jobRegistry: JobRegistry,
    private readonly scheduledJobsService: ScheduledJobsService,
    private readonly stepJobHandler: WorkflowStepJobHandler,
    private readonly scheduleTriggerJobHandler: WorkflowScheduleTriggerJobHandler,
    @Inject(forwardRef(() => WorkflowEngineService))
    private readonly workflowEngine: WorkflowEngineService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('AutomationService');
    this.jobRegistry.register(this.stepJobHandler);
    this.jobRegistry.register(this.scheduleTriggerJobHandler);
  }

  /** EVENT-triggered workflows: a definition auto-starts whenever the named domain event fires. */
  registerEventTrigger(registration: IEventTriggerRegistration): void {
    this.eventTriggers.push(registration);
    const handler: IEventHandler = {
      handle: async (event: IEvent) => {
        if (registration.tenantId && event.tenantId !== registration.tenantId) return;
        await this.workflowEngine.start({
          tenantId: event.tenantId ?? registration.tenantId ?? 'unknown',
          definitionKey: registration.definitionKey,
          triggerType: WorkflowTriggerType.EVENT,
          initialContext: registration.contextMapper ? registration.contextMapper(event) : { event },
        });
      },
    };
    this.eventBus.subscribe(registration.eventName, handler);
    this.logger.log(`Registered EVENT trigger: "${registration.eventName}" -> workflow "${registration.definitionKey}"`);
  }

  /** SCHEDULE-triggered workflows: recurring start via the job queue's delayed-job mechanism. WorkflowScheduleTriggerJobHandler re-arms itself after each fire. */
  async registerScheduleTrigger(registration: IScheduleTriggerRegistration): Promise<void> {
    await this.scheduledJobsService.scheduleAt(
      this.scheduleTriggerJobHandler.name,
      registration,
      new Date(Date.now() + registration.cronLikeIntervalMs),
    );
  }

  /** API-triggered workflows go straight through IWorkflowEngine.start() with triggerType: API — no automation bookkeeping needed. */

  /** CHAINED workflows: starts a follow-on workflow when another instance completes. Called by WorkflowEngineService on completion. */
  async chainWorkflow(
    tenantId: string,
    parentInstanceId: string,
    definitionKey: string,
    initialContext?: Record<string, unknown>,
  ): Promise<void> {
    await this.workflowEngine.start({
      tenantId,
      definitionKey,
      triggerType: WorkflowTriggerType.CHAINED,
      parentInstanceId,
      initialContext,
    });
  }

  /** Used by WorkflowExecutorService for SCHEDULED_TASK steps: defers a STEP_DUE job that calls back into the engine. */
  async scheduleWorkflowStep(instanceId: string, stepId: string, runAtMs?: number): Promise<void> {
    const runAt = new Date(runAtMs ?? Date.now());
    await this.scheduledJobsService.scheduleAt<WorkflowStepJobData>(
      this.stepJobHandler.name,
      { instanceId, stepId, kind: 'STEP_DUE' },
      runAt,
    );
  }

  /** Used by WorkflowExecutorService for HUMAN_TASK/APPROVAL steps with an `escalation` policy. */
  async scheduleEscalationCheck(instanceId: string, stepId: string, afterMs: number): Promise<void> {
    await this.scheduledJobsService.scheduleAt<WorkflowStepJobData>(
      this.stepJobHandler.name,
      { instanceId, stepId, kind: 'ESCALATION_CHECK' },
      new Date(Date.now() + afterMs),
    );
  }
}
