import { CacheService } from './cache.service';

describe('CacheService', () => {
  let redisMock: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    exists: jest.Mock;
    getClient: jest.Mock;
  };
  let loggerMock: { setContext: jest.Mock; debug: jest.Mock };
  let service: CacheService;

  beforeEach(() => {
    redisMock = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      getClient: jest.fn(),
    };
    loggerMock = { setContext: jest.fn(), debug: jest.fn() };
    service = new CacheService(redisMock as unknown as never, loggerMock as unknown as never);
  });

  it('returns null when key not found', async () => {
    redisMock.get.mockResolvedValue(null);
    expect(await service.get('missing')).toBeNull();
  });

  it('deserializes a stored JSON value', async () => {
    redisMock.get.mockResolvedValue(JSON.stringify({ a: 1 }));
    expect(await service.get('key')).toEqual({ a: 1 });
  });

  it('serializes and stores a value with default TTL', async () => {
    await service.set('key', { a: 1 });
    expect(redisMock.set).toHaveBeenCalledWith('key', JSON.stringify({ a: 1 }), 300);
  });

  it('wrap() returns cached value without calling factory on hit', async () => {
    redisMock.get.mockResolvedValue(JSON.stringify('cached'));
    const factory = jest.fn();

    const result = await service.wrap('key', factory);

    expect(result).toBe('cached');
    expect(factory).not.toHaveBeenCalled();
  });

  it('wrap() calls factory and stores result on miss', async () => {
    redisMock.get.mockResolvedValue(null);
    const factory = jest.fn().mockResolvedValue('fresh');

    const result = await service.wrap('key', factory);

    expect(result).toBe('fresh');
    expect(redisMock.set).toHaveBeenCalledWith('key', JSON.stringify('fresh'), 300);
  });

  it('invalidatePattern scans and deletes matching keys', async () => {
    const client = {
      scan: jest.fn().mockResolvedValue(['0', ['key:1', 'key:2']]),
      del: jest.fn().mockResolvedValue(2),
    };
    redisMock.getClient.mockReturnValue(client);

    const removed = await service.invalidatePattern('key:*');

    expect(removed).toBe(2);
    expect(client.del).toHaveBeenCalledWith('key:1', 'key:2');
  });
});
