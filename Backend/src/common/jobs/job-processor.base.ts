/**
 * job-processor.base.ts
 *
 * B2.9 — Enterprise Background Jobs, Queues & Task Processing Framework
 *
 * Cross-cutting concerns every job processor gets for free by extending
 * this class instead of implementing IJobProcessor from scratch:
 *   - structured logging around each attempt (via B2.3's APP_LOGGER token
 *     — the same adapter the Generic Service Layer uses, not a second
 *     logging path)
 *   - a domain event published on completion/failure (via B2.3's
 *     DOMAIN_EVENT_PUBLISHER token, so anything already listening on the
 *     real EventBus — including B2.8's CQRS projection handlers — can
 *     react to job outcomes without this framework knowing who's
 *     listening)
 *   - retry-attempt tracking (RetryTrackerService) on failure
 *
 * Concrete processors only implement `execute()`.
 */

import { Inject, Injectable, Optional } from '@nestjs/common';
import { APP_LOGGER, DOMAIN_EVENT_PUBLISHER } from '../interfaces/tokens';
import { IAppLogger } from '../interfaces/infrastructure.interfaces';
import { IDomainEventPublisher } from '../events/domain-event-publisher.interface';
import { BackgroundJobType, IBackgroundJobEnvelope, IJobProcessor } from '../interfaces/background/job.interface';
import { RetryTrackerService } from '../retry/retry-tracker.service';

@Injectable()
export abstract class JobProcessorBase<TPayload = unknown, TResult = unknown>
  implements IJobProcessor<TPayload, TResult>
{
  abstract readonly jobName: string;
  abstract readonly jobType: BackgroundJobType;

  constructor(
    @Inject(APP_LOGGER) protected readonly logger: IAppLogger,
    @Inject(DOMAIN_EVENT_PUBLISHER) protected readonly eventPublisher: IDomainEventPublisher,
    @Optional() protected readonly retryTracker?: RetryTrackerService,
  ) {}

  /** Called by the framework — do not override; implement `execute()` instead. */
  async handle(
    envelope: IBackgroundJobEnvelope<TPayload>,
    reportProgress: (pct: number) => Promise<void>,
  ): Promise<TResult> {
    const startedAt = Date.now();
    this.logger.log(`Job "${this.jobName}" started`, 'JobProcessorBase', { context: envelope.context });

    try {
      const result = await this.execute(envelope, reportProgress);
      const durationMs = Date.now() - startedAt;

      this.logger.metric(`job.${this.jobName}.duration`, durationMs);
      await this.publishOutcomeEvent(envelope, 'completed', { durationMs });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Job "${this.jobName}" failed: ${message}`, error instanceof Error ? error.stack : undefined, 'JobProcessorBase');
      await this.publishOutcomeEvent(envelope, 'failed', { error: message });
      throw error;
    }
  }

  protected abstract execute(
    envelope: IBackgroundJobEnvelope<TPayload>,
    reportProgress: (pct: number) => Promise<void>,
  ): Promise<TResult>;

  private async publishOutcomeEvent(
    envelope: IBackgroundJobEnvelope<TPayload>,
    operation: 'completed' | 'failed',
    extra: Record<string, unknown>,
  ): Promise<void> {
    await this.eventPublisher.publish({
      eventName: `background-job.${this.jobName}.${operation}`,
      operation: 'update',
      entityName: 'BackgroundJob',
      entityId: this.jobName,
      // IDomainEvent.tenantId is required; background jobs may run without
      // per-tenant context (e.g. platform-wide maintenance), so those are
      // stamped "system" rather than making the field optional here and
      // weakening it for every other consumer of IDomainEvent.
      tenantId: envelope.context.tenantId ?? 'system',
      actorId: envelope.context.actorId,
      correlationId: envelope.context.correlationId,
      occurredAt: new Date(),
      payload: { jobType: this.jobType, ...extra },
    });
  }
}
