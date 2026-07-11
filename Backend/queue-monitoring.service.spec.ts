import { QueueMonitoringService } from './queue-monitoring.service';
import { RetryJobsService } from './retry-jobs.service';

describe('QueueMonitoringService', () => {
  it('tracks counters independently', () => {
    const service = new QueueMonitoringService();
    service.recordEnqueued();
    service.recordEnqueued();
    service.recordProcessed();
    service.recordFailed();
    service.recordRetried();

    expect(service.getSnapshot()).toEqual({ enqueued: 2, processed: 1, failed: 1, retried: 1 });
  });
});

describe('RetryJobsService', () => {
  it('allows retry below max attempts', () => {
    const delayedJobsMock = { enqueueRaw: jest.fn() };
    const monitoring = new QueueMonitoringService();
    const service = new RetryJobsService(delayedJobsMock as unknown as never, monitoring);

    expect(service.shouldRetry({ jobId: '1', name: 'x', data: {}, attempts: 1, maxAttempts: 5 })).toBe(
      true,
    );
  });

  it('denies retry at max attempts', () => {
    const delayedJobsMock = { enqueueRaw: jest.fn() };
    const monitoring = new QueueMonitoringService();
    const service = new RetryJobsService(delayedJobsMock as unknown as never, monitoring);

    expect(service.shouldRetry({ jobId: '1', name: 'x', data: {}, attempts: 5, maxAttempts: 5 })).toBe(
      false,
    );
  });

  it('retry() increments attempts and preserves jobId', async () => {
    const delayedJobsMock = { enqueueRaw: jest.fn().mockResolvedValue(undefined) };
    const monitoring = new QueueMonitoringService();
    const service = new RetryJobsService(delayedJobsMock as unknown as never, monitoring);

    const payload = { jobId: 'job-1', name: 'x', data: {}, attempts: 1, maxAttempts: 5 };
    const jobId = await service.retry(payload);

    expect(jobId).toBe('job-1');
    expect(delayedJobsMock.enqueueRaw).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-1', attempts: 2 }),
      expect.any(Number),
    );
  });
});
