import { MessageRetryStrategy } from './retry-strategy';

describe('MessageRetryStrategy', () => {
  it('allows retry while attempts remain', () => {
    expect(MessageRetryStrategy.shouldRetry(2, 5)).toBe(true);
  });

  it('denies retry once max attempts reached', () => {
    expect(MessageRetryStrategy.shouldRetry(5, 5)).toBe(false);
  });

  it('computes exponential backoff capped at 30s', () => {
    expect(MessageRetryStrategy.nextDelayMs(0, 1000)).toBe(1000);
    expect(MessageRetryStrategy.nextDelayMs(3, 1000)).toBe(8000);
    expect(MessageRetryStrategy.nextDelayMs(10, 1000)).toBe(30000);
  });
});
