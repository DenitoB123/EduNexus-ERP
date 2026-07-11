import { ProjectionIdempotencyGuard } from './projection-idempotency.guard';
import { CacheService } from '../../../infrastructure/cache/cache.service';

describe('ProjectionIdempotencyGuard', () => {
  let cacheService: jest.Mocked<Pick<CacheService, 'exists' | 'set'>>;
  let guard: ProjectionIdempotencyGuard;

  beforeEach(() => {
    cacheService = { exists: jest.fn(), set: jest.fn() };
    guard = new ProjectionIdempotencyGuard(cacheService as unknown as CacheService);
  });

  it('reports not-applied when no marker exists', async () => {
    cacheService.exists.mockResolvedValue(false);
    await expect(guard.hasApplied('event-1', 'StudentSummaryProjection')).resolves.toBe(false);
    expect(cacheService.exists).toHaveBeenCalledWith(
      'cqrs:projection:applied:StudentSummaryProjection:event-1',
    );
  });

  it('marks an event as applied with the configured TTL', async () => {
    await guard.markApplied('event-1', 'StudentSummaryProjection');
    expect(cacheService.set).toHaveBeenCalledWith(
      'cqrs:projection:applied:StudentSummaryProjection:event-1',
      true,
      60 * 60 * 24,
    );
  });
});
