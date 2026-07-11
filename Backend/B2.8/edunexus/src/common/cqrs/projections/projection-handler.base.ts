import { IEvent, IEventHandler } from '../../../infrastructure/interfaces/event.interface';
import { ProjectionIdempotencyGuard } from './projection-idempotency.guard';
import { AppLoggerService } from '../../logger/app-logger.service';

/**
 * Base class for a read-model projection. Subclasses are registered
 * exactly like any other event handler — decorate a method with the
 * existing `@OnEvent('some.event')`
 * (infrastructure/events/event-subscriber.decorator.ts, B1.3) on a
 * `@Injectable()` provider, and `EventSubscriberExplorer` picks it up.
 * `ProjectionHandlerBase` is *not itself* auto-discovered (it has no
 * `@OnEvent` metadata) — it's a convenience the subclass's `@OnEvent`
 * -decorated method delegates to, adding the idempotency check around
 * `applyProjection()`.
 *
 * @example
 * @Injectable()
 * class StudentSummaryProjection extends ProjectionHandlerBase<StudentEnrolledEvent> {
 *   protected readonly projectionName = 'StudentSummaryProjection';
 *   protected async applyProjection(event: StudentEnrolledEvent) { ... }
 *
 *   @OnEvent('student.enrolled')
 *   async handle(event: StudentEnrolledEvent) {
 *     await this.handleIdempotently(event);
 *   }
 * }
 */
export abstract class ProjectionHandlerBase<TEvent extends IEvent = IEvent>
  implements IEventHandler<TEvent>
{
  protected abstract readonly projectionName: string;
  protected abstract readonly eventName: string;

  protected constructor(
    private readonly idempotencyGuard: ProjectionIdempotencyGuard,
    private readonly logger: AppLoggerService,
  ) {}

  async handle(event: TEvent): Promise<void> {
    await this.handleIdempotently(event);
  }

  protected abstract applyProjection(event: TEvent): Promise<void>;

  protected async handleIdempotently(event: TEvent): Promise<void> {
    const alreadyApplied = await this.idempotencyGuard.hasApplied(event.eventId, this.projectionName);

    if (alreadyApplied) {
      this.logger.debug(
        `Skipping "${this.projectionName}" for event "${event.eventId}" — already applied`,
        this.projectionName,
      );
      return;
    }

    await this.applyProjection(event);
    await this.idempotencyGuard.markApplied(event.eventId, this.projectionName);
  }
}
