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
});
