import { MockFactory } from './mock.factory';
import { TestFixtures } from './test.fixtures';
import { FakeDataBuilder } from './fake-data.builder';
import { MockRequestBuilder } from './mock-request.builder';
import { UnitTestHelpers } from './unit-test.helpers';

interface ExampleService {
  findById(id: string): Promise<unknown>;
  create(data: unknown): Promise<unknown>;
}

describe('MockFactory', () => {
  it('creates mocked methods resolving undefined by default', async () => {
    const mock = MockFactory.create<ExampleService>(['findById', 'create']);
    expect(typeof mock.findById).toBe('function');
    await expect(mock.findById('x')).resolves.toBeUndefined();
  });

  it('creates mocked methods with specified default returns', async () => {
    const mock = MockFactory.create<ExampleService>(['findById'], { id: '1' });
    await expect(mock.findById('1')).resolves.toEqual({ id: '1' });
  });
});

describe('TestFixtures', () => {
  it('builds a base entity with all required fields', () => {
    const entity = TestFixtures.baseEntity({ id: 'fixed-id' });
    expect(entity.id).toBe('fixed-id');
    expect(entity.tenantId).toBe('test-tenant-id');
    expect(entity.version).toBe(1);
    expect(entity.deletedAt).toBeNull();
  });

  it('builds a paginated result with correct meta', () => {
    const result = TestFixtures.paginatedResult([1, 2, 3], 50);
    expect(result.items).toHaveLength(3);
    expect(result.meta.totalItems).toBe(50);
    expect(result.meta.hasNextPage).toBe(true);
  });
});

describe('FakeDataBuilder', () => {
  it('generates a valid email address', () => {
    const email = FakeDataBuilder.email('Ada Lovelace');
    expect(email).toContain('@');
    expect(email).toMatch(/ada\.lovelace@/);
  });

  it('generates a numeric code of the given length', () => {
    const code = FakeDataBuilder.numericCode(4);
    expect(code).toHaveLength(4);
    expect(/^\d{4}$/.test(code)).toBe(true);
  });
});

describe('MockRequestBuilder', () => {
  it('builds a request with expected defaults', () => {
    const request = new MockRequestBuilder().build();
    expect(request.method).toBe('GET');
    expect((request.tenantContext as Record<string, string>).tenantId).toBe('test-tenant-id');
  });

  it('overrides properties via builder methods', () => {
    const request = new MockRequestBuilder()
      .withMethod('POST')
      .withBody({ name: 'Test' })
      .withHeader('x-request-id', 'abc')
      .build();

    expect(request.method).toBe('POST');
    expect(request.body).toEqual({ name: 'Test' });
    expect((request.headers as Record<string, string>)['x-request-id']).toBe('abc');
  });
});

describe('UnitTestHelpers', () => {
  it('creates a tenant context mock returning test defaults', () => {
    const mock = UnitTestHelpers.createTenantContextMock();
    expect(mock.requireTenantId()).toBe('test-tenant-id');
    expect(mock.getActorId()).toBe('test-actor-id');
  });
});
