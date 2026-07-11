import { ConnectionRetryStrategy } from './connection-retry.strategy';

describe('ConnectionRetryStrategy', () => {
  it('returns result immediately on first success', async () => {
    const operation = jest.fn().mockResolvedValue('ok');
    const result = await ConnectionRetryStrategy.execute(operation, { attempts: 3, delayMs: 1 });
    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries until success within attempt budget', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-2'))
      .mockResolvedValueOnce('ok');

    const result = await ConnectionRetryStrategy.execute(operation, { attempts: 5, delayMs: 1 });
    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('throws the last error after exhausting all attempts', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('always fails'));

    await expect(
      ConnectionRetryStrategy.execute(operation, { attempts: 3, delayMs: 1 }),
    ).rejects.toThrow('always fails');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('invokes onAttemptFailed callback for each failed attempt', async () => {
    const operation = jest.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce('ok');
    const onAttemptFailed = jest.fn();

    await ConnectionRetryStrategy.execute(operation, { attempts: 3, delayMs: 1 }, onAttemptFailed);
    expect(onAttemptFailed).toHaveBeenCalledTimes(1);
    expect(onAttemptFailed).toHaveBeenCalledWith(1, expect.any(Error));
  });
});
