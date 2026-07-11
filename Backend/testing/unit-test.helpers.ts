import { TestFixtures } from './test.fixtures';

export class UnitTestHelpers {
  static createLoggerMock() {
    return {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };
  }

  static createTenantContextMock(overrides: Record<string, unknown> = {}) {
    return {
      getTenantId: jest.fn().mockReturnValue(TestFixtures.tenantId),
      requireTenantId: jest.fn().mockReturnValue(TestFixtures.tenantId),
      getActorId: jest.fn().mockReturnValue(TestFixtures.actorId),
      getCorrelationId: jest.fn().mockReturnValue(TestFixtures.correlationId),
      getContext: jest.fn().mockReturnValue({ tenantId: TestFixtures.tenantId }),
      run: jest.fn().mockImplementation((_ctx: unknown, cb: () => unknown) => cb()),
      ...overrides,
    };
  }

  static createRepositoryMock<T>(entity: T) {
    return {
      findById: jest.fn().mockResolvedValue(entity),
      findOne: jest.fn().mockResolvedValue(entity),
      findMany: jest.fn().mockResolvedValue(TestFixtures.paginatedResult([entity])),
      create: jest.fn().mockResolvedValue(entity),
      update: jest.fn().mockResolvedValue(entity),
      softDelete: jest.fn().mockResolvedValue(entity),
      restore: jest.fn().mockResolvedValue(entity),
      hardDelete: jest.fn().mockResolvedValue(undefined),
      count: jest.fn().mockResolvedValue(1),
    };
  }

  static createConfigMock(overrides: Record<string, unknown> = {}) {
    return {
      app: { nodeEnv: 'test', port: 3000, apiPrefix: 'api' },
      database: { logging: false, slowQueryThresholdMs: 500, retry: { attempts: 3, delayMs: 100 }, pool: { min: 1, max: 5 }, ssl: { enabled: false } },
      redis: { host: 'localhost', port: 6379 },
      rabbitmq: { url: 'amqp://localhost', exchange: 'test-exchange', queuePrefix: 'test', queue: 'test-queue' },
      jwt: { secret: 'test-secret', expiresIn: '1h' },
      ...overrides,
    };
  }
}
