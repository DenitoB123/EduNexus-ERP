/**
 * workflow-job.processor.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * Base class for WORKFLOW jobs (approval workflows, notification
 * workflows, business/automation workflows per the B2.9 spec). Each
 * workflow job represents one *step*; a step completing enqueues the next
 * step's job (via `advanceTo()`) rather than this framework owning a
 * separate workflow-orchestration engine — the queue itself is the
 * orchestrator, and `envelope.workflow` carries the shared `workflowId` so
 * every step's audit/event trail can be correlated.
 *
 * EVENT_DRIVEN jobs (the sixth job type in the B2.9 spec) are just
 * workflow jobs whose *first* step is triggered by a domain event instead
 * of a direct enqueue call — see `WorkflowJobProcessor.triggerOnEvent()`,
 * which subscribes through the existing EventBus (B1.3) rather than a
 * second event mechanism.
 */

import { BackgroundJobType, IBackgroundJobEnvelope, IJobContext } from '../interfaces/background/job.interface';
import { JobProcessorBase } from './job-processor.base';
import { QueueService } from '../queues/queue.service';
import { EventBus } from '../../infrastructure/events/event-bus.service';
import { IEvent } from '../../infrastructure/interfaces/event.interface';

export abstract class WorkflowJobProcessor<TPayload = unknown, TResult = unknown> extends JobProcessorBase<
  TPayload,
  TResult
> {
  readonly jobType = BackgroundJobType.WORKFLOW;

  protected abstract readonly queueName: string;

  /** Enqueues the next step of this workflow on the same queue, preserving `workflowId` for correlation. */
  protected async advanceTo<TNextPayload>(
    queueService: QueueService,
    nextStepJobName: string,
    nextPayload: TNextPayload,
    workflow: NonNullable<IBackgroundJobEnvelope['workflow']>,
    context: IJobContext,
  ): Promise<string> {
    return queueService.add<IBackgroundJobEnvelope<TNextPayload>>(this.queueName, nextStepJobName, {
      jobType: BackgroundJobType.WORKFLOW,
      context,
      payload: nextPayload,
      workflow,
    });
  }

  /**
   * Wires an EVENT_DRIVEN job's first step to a domain event. Call once at
   * bootstrap (e.g. in the owning module's constructor/onModuleInit).
   * Reuses EventBus.subscribe() (B1.3) — does not add a second pub/sub path.
   */
  static triggerOnEvent<TEvent extends IEvent, TPayload>(
    eventBus: EventBus,
    eventName: string,
    queueService: QueueService,
    queueName: string,
    jobName: string,
    mapEventToPayload: (event: TEvent) => TPayload,
    workflowIdFromEvent: (event: TEvent) => string,
  ): void {
    eventBus.subscribe(eventName, {
      handle: async (event: TEvent) => {
        await queueService.add<IBackgroundJobEnvelope<TPayload>>(queueName, jobName, {
          jobType: BackgroundJobType.EVENT_DRIVEN,
          context: { tenantId: event.tenantId, correlationId: event.correlationId },
          payload: mapEventToPayload(event),
          workflow: { workflowId: workflowIdFromEvent(event), stepName: jobName, correlatesWithEventName: eventName },
        });
      },
    });
  }
}
