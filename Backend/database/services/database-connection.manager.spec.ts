import { DatabaseConnectionManager } from './database-connection.manager';

describe('DatabaseConnectionManager', () => {
  let loggerMock: { setContext: jest.Mock; warn: jest.Mock; error: jest.Mock; log: jest.Mock };
  let configMock: { database: { retry: { attempts: number; delayMs: number } } };
  let manager: DatabaseConnectionManager;

  beforeEach(() => {
    loggerMock = { setContext: jest.fn(), warn: jest.fn(), error: jest.fn(), log: jest.fn() };
    configMock = { database: { retry: { attempts: 3, delayMs: 1 } } };
    manager = new DatabaseConnectionManager(
      loggerMock as unknown as never,
      configMock as unknown as never,
    );
  });

  it('starts in idle state and not connected', () => {
    expect(manager.getState()).toBe('idle');
    expect(manager.isConnected()).toBe(false);
  });

  it('transitions to connected on successful connect', async () => {
    await manager.connectWithRetry(() => Promise.resolve());
    expect(manager.getState()).toBe('connected');
    expect(manager.isConnected()).toBe(true);
  });

  it('transitions to failed and throws after exhausting retries', async () => {
    const connect = jest.fn().mockRejectedValue(new Error('db down'));

    await expect(manager.connectWithRetry(connect)).rejects.toThrow(/Unable to connect to database/);
    expect(manager.getState()).toBe('failed');
    expect(connect).toHaveBeenCalledTimes(3);
  });

  it('marks disconnected', async () => {
    await manager.connectWithRetry(() => Promise.resolve());
    manager.markDisconnected();
    expect(manager.getState()).toBe('disconnected');
    expect(manager.isConnected()).toBe(false);
  });
});
