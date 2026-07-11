import { TransactionService } from './transaction.service';
import { DATABASE_CONSTANTS } from '../constants/database.constants';

describe('TransactionService', () => {
  let prismaMock: { $transaction: jest.Mock };
  let loggerMock: { setContext: jest.Mock; error: jest.Mock };
  let service: TransactionService;

  beforeEach(() => {
    prismaMock = { $transaction: jest.fn() };
    loggerMock = { setContext: jest.fn(), error: jest.fn() };
    service = new TransactionService(
      prismaMock as unknown as never,
      loggerMock as unknown as never,
    );
  });

  it('runs work inside $transaction with default timeout/maxWait', async () => {
    prismaMock.$transaction.mockImplementation((work: (tx: unknown) => unknown) => work({}));
    const work = jest.fn().mockResolvedValue('done');

    const result = await service.run(work);

    expect(result).toBe('done');
    expect(prismaMock.$transaction).toHaveBeenCalledWith(work, {
      timeout: DATABASE_CONSTANTS.TRANSACTION_DEFAULT_TIMEOUT_MS,
      maxWait: DATABASE_CONSTANTS.TRANSACTION_MAX_WAIT_MS,
      isolationLevel: undefined,
    });
  });

  it('wraps and rethrows on transaction failure', async () => {
    prismaMock.$transaction.mockRejectedValue(new Error('boom'));

    await expect(service.run(jest.fn())).rejects.toThrow(/Transaction execution failed/);
    expect(loggerMock.error).toHaveBeenCalled();
  });

  it('runs batch operations via $transaction array form', async () => {
    prismaMock.$transaction.mockResolvedValue(['a', 'b']);
    const ops = [Promise.resolve('a'), Promise.resolve('b')] as never[];

    const result = await service.runBatch(ops);
    expect(result).toEqual(['a', 'b']);
  });

  describe('runWithRetry', () => {
    it('returns the result on first success without retrying', async () => {
      prismaMock.$transaction.mockImplementation((work: (tx: unknown) => unknown) => work({}));
      const work = jest.fn().mockResolvedValue('ok');

      const result = await service.runWithRetry(work, { retryDelayMs: 1 });

      expect(result).toBe('ok');
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('retries on a retriable Prisma error code and eventually succeeds', async () => {
      const retriableError = Object.assign(new Error('connection lost'), { code: 'P1001' });

      prismaMock.$transaction
        .mockRejectedValueOnce(retriableError)
        .mockImplementationOnce((work: (tx: unknown) => unknown) => work({}));

      const work = jest.fn().mockResolvedValue('recovered');

      const result = await service.runWithRetry(work, { maxAttempts: 3, retryDelayMs: 1 });

      expect(result).toBe('recovered');
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    });

    it('does not retry a non-retriable error', async () => {
      prismaMock.$transaction.mockRejectedValue(new Error('validation failed'));

      await expect(service.runWithRetry(jest.fn(), { maxAttempts: 3, retryDelayMs: 1 })).rejects.toThrow();
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('gives up after maxAttempts and throws the last error', async () => {
      const retriableError = Object.assign(new Error('deadlock'), { code: 'P1008' });
      prismaMock.$transaction.mockRejectedValue(retriableError);

      await expect(service.runWithRetry(jest.fn(), { maxAttempts: 2, retryDelayMs: 1 })).rejects.toThrow();
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    });
  });
});
