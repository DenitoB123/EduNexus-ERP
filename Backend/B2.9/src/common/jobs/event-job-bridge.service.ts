/**
 * event-job-bridge.service.ts
 *
 * B2.9 — Enterprise Asynchronous Processing Framework
 *
 * The general-purpose mechanism for "RabbitMQ event triggers BullMQ
 * job(s)" — e.g. StudentCreatedEvent -> [generate-student-id,
 * generate-portal-account, send-welcome-email, notify-parent,
 * generate-audit-summary], each running as an independent BullMQ job so
 * none of them block the HTTP request that caused the event.
 *
 * Subscribes through IEventBus (RabbitMqEventBusAdapter, i.e. the
 * existing EventBus underneath — no second pub/sub mechanism) and
 * enqueues through IBackgroundJobService (BullMqBackgroundJobAdapter).
 * Business modules call `bridge()` once per event->job(s) mapping,
 * typically from their module's constructor.
 *
 * This is a thin convenience over calling `eventBus.on()` +
 * `jobService.enqueue()` directly — use it for the common case of "one
 * event fans out to N independent jobs"; WorkflowJobProcessor.triggerOnEvent
 * (jobs/workflow-job.processor.ts) remains the right tool when the
 * triggered job is itself the first step of a multi-step, correlated
 * workflow rather than a set of independent fan-out jobs.
 */

import { Inject, Injectable } from '@nestjs/common';
import { EVENT_BUS, IEventBus } from '../interfaces/background/event-bus.interface';
import { BACKGROUND_JOB_SERVICE, IBackgroundJobService } from '../interfaces/background/background-job-service.interface';
import { IEvent } from '../../infrastructure/interfaces/event.interface';
import { AppLoggerService } from '../logger/app-logger.service';

export interface IEventJobMapping<TEvent extends IEvent, TPayload> {
  queueName: string;
  jobName: string;
  mapPayload: (event: TEvent) => TPayload;
}

@Injectable()
export class EventJobBridgeService {
  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(BACKGROUND_JOB_SERVICE) private readonly jobService: IBackgroundJobService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('EventJobBridgeService');
  }

  /** Wires `eventName` to fan out into one or more independent BullMQ jobs. */
  bridge<TEvent extends IEvent>(eventName: string, mappings: IEventJobMapping<TEvent, unknown>[]): void {
    this.eventBus.on<TEvent>(eventName, {
      handle: async (event: TEvent) => {
        this.logger.debug(`Event "${eventName}" fanning out to ${mappings.length} background job(s)`);

        await Promise.all(
          mappings.map((mapping) =>
            this.jobService.enqueue(mapping.queueName, mapping.jobName, mapping.mapPayload(event), {
              context: { tenantId: event.tenantId, correlationId: event.correlationId },
            }),
          ),
        );
      },
    });
  }
}
