import { BulkProcessingHelper } from './bulk-processing.helper';
import { BulkResponseBuilder } from './bulk-response.builder';

describe('BulkProcessingHelper', () => {
  it('processes all items successfully', async () => {
    const result = await BulkProcessingHelper.process([1, 2, 3], async (item) => item * 2);
    expect(result.succeeded).toEqual([2, 4, 6]);
    expect(result.failureCount).toBe(0);
    expect(result.successCount).toBe(3);
  });

  it('collects per-item errors without stopping by default', async () => {
    const result = await BulkProcessingHelper.process([1, 2, 3], async (item) => {
      if (item === 2) throw new Error('boom');
      return item;
    });

    expect(result.succeeded).toEqual([1, 3]);
    expect(result.failed).toEqual([{ index: 1, error: 'boom' }]);
    expect(result.total).toBe(3);
  });

  it('stops immediately when failFast is true', async () => {
    const handler = jest.fn(async (item: number) => {
      if (item === 2) throw new Error('stop here');
      return item;
    });

    const result = await BulkProcessingHelper.process([1, 2, 3], handler, { failFast: true });

    expect(handler).toHaveBeenCalledTimes(2);
    expect(result.succeeded).toEqual([1]);
    expect(result.failed).toEqual([{ index: 1, error: 'stop here' }]);
  });
});

describe('BulkResponseBuilder', () => {
  it('builds an empty result', () => {
    expect(BulkResponseBuilder.empty()).toEqual({
      succeeded: [],
      failed: [],
      total: 0,
      successCount: 0,
      failureCount: 0,
    });
  });
});
