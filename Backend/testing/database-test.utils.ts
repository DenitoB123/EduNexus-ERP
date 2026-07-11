import { TenantContextData } from '../interfaces/tenant-context.interface';

export type DeepMockProxy<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? jest.Mock<R, A>
    : T[K] extends object
      ? DeepMockProxy<T[K]>
      : T[K];
};

export class DatabaseTestUtils {
  static createMockPrismaService(): Record<string, unknown> {
    const modelMock = () => ({
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    });

    return {
      healthCheck: modelMock(),
      seedLog: modelMock(),
      $transaction: jest.fn((arg: unknown) =>
        typeof arg === 'function' ? arg({}) : Promise.all(arg as Promise<unknown>[]),
      ),
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]),
      $on: jest.fn(),
      isHealthy: jest.fn().mockResolvedValue(true),
      enableShutdownHooks: jest.fn().mockResolvedValue(undefined),
    };
  }

  static createTenantContext(overrides: Partial<TenantContextData> = {}): TenantContextData {
    return {
      tenantId: 'test-tenant',
      correlationId: 'test-correlation-id',
      ...overrides,
    };
  }
}
