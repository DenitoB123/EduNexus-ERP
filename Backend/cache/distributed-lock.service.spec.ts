import { DistributedLockService } from './distributed-lock.service';

describe('DistributedLockService', () => {
  let clientMock: { set: jest.Mock; eval: jest.Mock };
  let redisMock: { getClient: jest.Mock };
  let loggerMock: { setContext: jest.Mock };
  let service: DistributedLockService;

  beforeEach(() => {
    clientMock = { set: jest.fn(), eval: jest.fn() };
    redisMock = { getClient: jest.fn().mockReturnValue(clientMock) };
    loggerMock = { setContext: jest.fn() };
    service = new DistributedLockService(redisMock as unknown as never, loggerMock as unknown as never);
  });

  it('acquires a lock when SET NX succeeds', async () => {
    clientMock.set.mockResolvedValue('OK');
    const lock = await service.acquire('resource:1');
    expect(lock).not.toBeNull();
    expect(lock?.key).toBe('resource:1');
  });

  it('returns null when the lock is already held', async () => {
    clientMock.set.mockResolvedValue(null);
    const lock = await service.acquire('resource:1');
    expect(lock).toBeNull();
  });

  it('releases a lock it owns via the CAS script', async () => {
    clientMock.eval.mockResolvedValue(1);
    const released = await service.release({ key: 'resource:1', token: 'abc' });
    expect(released).toBe(true);
  });

  it('withLock acquires, runs work, and always releases', async () => {
    clientMock.set.mockResolvedValue('OK');
    clientMock.eval.mockResolvedValue(1);

    const result = await service.withLock('resource:1', async () => 'done');

    expect(result).toBe('done');
    expect(clientMock.eval).toHaveBeenCalled();
  });

  it('withLock throws when the lock cannot be acquired', async () => {
    clientMock.set.mockResolvedValue(null);
    await expect(service.withLock('resource:1', async () => 'done')).rejects.toThrow(
      /Could not acquire lock/,
    );
  });
});
