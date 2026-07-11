import { ProjectionHandlerBase } from './projection-handler.base';
import { ProjectionIdempotencyGuard } from './projection-idempotency.guard';
import { AppLoggerService } from '../../logger/app-logger.service';
import { IEvent } from '../../../infrastructure/interfaces/event.interface';

interface TestEvent extends IEvent {
  payload: string;
}

class TestProjection extends ProjectionHandlerBase<TestEvent> {
  protected readonly projectionName = 'TestProjection';
  protected readonly eventName = 'test.event';
  applyProjection = jest.fn().mockResolvedValue(undefined);

  constructor(guard: ProjectionIdempotencyGuard, logger: AppLoggerService) {
    super(guard, logger);
  }
}

describe('ProjectionHandlerBase', () => {
  let guard: jest.Mocked<Pick<ProjectionIdempotencyGuard, 'hasApplied' | 'markApplied'>>;
  let logger: jest.Mocked<Pick<AppLoggerService, 'debug' | 'setContext'>>;
  let projection: TestProjection;
  const event: TestEvent = { eventId: 'e1', eventName: 'test.event', occurredAt: new Date(), payload: 'x' };

  beforeEach(() => {
    guard = { hasApplied: jest.fn(), markApplied: jest.fn() };
    logger = { debug: jest.fn(), setContext: jest.fn() };
    projection = new TestProjection(
      guard as unknown as ProjectionIdempotencyGuard,
      logger as unknown as AppLoggerService,
    );
  });

  it('applies the projection and marks it applied when not seen before', async () => {
    guard.hasApplied.mockResolvedValue(false);

    await projection.handle(event);

    expect(projection.applyProjection).toHaveBeenCalledWith(event);
    expect(guard.markApplied).toHaveBeenCalledWith('e1', 'TestProjection');
  });

  it('skips the projection when the event was already applied', async () => {
    guard.hasApplied.mockResolvedValue(true);

    await projection.handle(event);

    expect(projection.applyProjection).not.toHaveBeenCalled();
    expect(guard.markApplied).not.toHaveBeenCalled();
  });
});
